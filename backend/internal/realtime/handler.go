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

	connectionContext, cancelConnection := context.WithCancel(context.Background())
	connectedClient := newClient(joinMessage.Role, connection)
	go connectedClient.writeLoop(connectionContext)
	handler.hub.register(connectedClient)

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

		if connectedClient.role != RoleController {
			connectedClient.enqueue(errorMessage("role_not_allowed", errors.New("only the controller can send input")))
			continue
		}

		if err := message.ValidateInput(); err != nil {
			connectedClient.enqueue(errorMessage("invalid_message", err))
			continue
		}

		if err := handler.hub.forwardInput(connectedClient, message); err != nil {
			connectedClient.enqueue(errorMessage("input_not_forwarded", err))
		}
	}
}
