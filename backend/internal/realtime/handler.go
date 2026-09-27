package realtime

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

const (
	joinTimeout     = 10 * time.Second
	maxMessageBytes = 4 * 1024
	pingInterval    = 15 * time.Second
	pongTimeout     = 10 * time.Second
)

type Handler struct {
	hub            *Hub
	originPatterns []string
}

func NewHandler(hub *Hub, originPatterns []string) *Handler {
	return &Handler{hub: hub, originPatterns: originPatterns}
}

func (handler *Handler) ServeHTTP(response http.ResponseWriter, request *http.Request) {
	connection, err := websocket.Accept(response, request, &websocket.AcceptOptions{
		OriginPatterns: handler.originPatterns,
	})
	if err != nil {
		log.Printf("websocket connection rejected: %v", err)
		return
	}
	connection.SetReadLimit(maxMessageBytes)

	joinContext, cancelJoin := context.WithTimeout(context.Background(), joinTimeout)
	var joinMessage Message
	err = wsjson.Read(joinContext, connection, &joinMessage)
	cancelJoin()
	if err != nil {
		_ = connection.Close(websocket.StatusPolicyViolation, "join message required")
		return
	}
	if err := joinMessage.ValidateJoin(); err != nil {
		_ = connection.Close(websocket.StatusPolicyViolation, err.Error())
		return
	}

	// A joining game screen always gets a fresh pairing code, which also kicks any
	// controller still paired with the previous one. A controller must present the
	// code currently printed in the QR.
	var sessionToken string
	if joinMessage.Role == RoleGame {
		sessionToken, err = handler.hub.resumeOrRotateSession(joinMessage.Session)
		if err != nil {
			_ = connection.Close(websocket.StatusInternalError, "could not create a pairing code")
			return
		}
	} else if err := handler.hub.authorizeController(joinMessage.Session); err != nil {
		_ = connection.Close(websocket.StatusPolicyViolation, err.Error())
		return
	}

	connectionContext, cancelConnection := context.WithCancel(context.Background())
	connectedClient := newClient(joinMessage.Role, connection)
	go connectedClient.writeLoop(connectionContext)
	go keepAlive(connectionContext, connection, connectedClient)
	handler.hub.register(connectedClient)

	if sessionToken != "" {
		connectedClient.enqueue(sessionMessage(sessionToken))
	}

	defer func() {
		handler.hub.unregister(connectedClient)
		cancelConnection()
		connectedClient.closeNow()
		log.Printf("%s client disconnected", connectedClient.role)
	}()

	log.Printf("%s client connected", connectedClient.role)

	for {
		var message Message
		if err := wsjson.Read(connectionContext, connection, &message); err != nil {
			if closeStatus := websocket.CloseStatus(err); closeStatus != websocket.StatusNormalClosure && !errors.Is(err, context.Canceled) {
				log.Printf("%s client read stopped: %v", connectedClient.role, err)
			}
			return
		}

		if connectedClient.role == RoleGame {
			handler.handleGameMessage(connectedClient, message)
			continue
		}

		var forwarded Message
		switch message.Type {
		case MessageTypeInput:
			if err := message.ValidateInput(); err != nil {
				connectedClient.enqueue(errorMessage("invalid_message", err))
				continue
			}
			forwarded = Message{Type: MessageTypeInput, Key: message.Key, Pressed: message.Pressed}
		case MessageTypeInputReset:
			if err := message.ValidateInputReset(); err != nil {
				connectedClient.enqueue(errorMessage("invalid_message", err))
				continue
			}
			forwarded = Message{Type: MessageTypeInputReset}
		default:
			connectedClient.enqueue(errorMessage("invalid_message", errors.New("unrecognized message type")))
			continue
		}

		if err := handler.hub.forwardInput(connectedClient, forwarded); err != nil {
			connectedClient.enqueue(errorMessage("input_not_forwarded", err))
		}
	}
}

func (handler *Handler) handleGameMessage(gameClient *client, message Message) {
	if message.Type != MessageTypeNewSession {
		gameClient.enqueue(errorMessage("role_not_allowed", errors.New("only the controller can send input")))
		return
	}

	token, err := handler.hub.rotateSession()
	if err != nil {
		gameClient.enqueue(errorMessage("session_rotation_failed", err))
		return
	}
	gameClient.enqueue(sessionMessage(token))
}

// keepAlive detects peers that vanished without closing the socket - a phone that
// locked, lost Wi-Fi or ran out of battery. Without it those connections keep
// holding the controller slot forever.
func keepAlive(ctx context.Context, connection *websocket.Conn, connectedClient *client) {
	ticker := time.NewTicker(pingInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-connectedClient.done:
			return
		case <-ticker.C:
			pingContext, cancel := context.WithTimeout(ctx, pongTimeout)
			err := connection.Ping(pingContext)
			cancel()
			if err != nil {
				connectedClient.closeNow()
				return
			}
		}
	}
}
