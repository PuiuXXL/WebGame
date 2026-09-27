package realtime

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"sync"

	"github.com/coder/websocket"
)

var (
	errControllerNotActive = errors.New("controller connection is not active")
	errGameNotConnected    = errors.New("game is not connected")
	errGameNotResponding   = errors.New("game connection is not responding")
	errSessionMismatch     = errors.New("pairing code is not valid anymore, scan the current QR code")
)

// Hub owns the shared state: one game screen, one controller, and the pairing
// token that the controller must present. Rotating the token is what lets the
// game hand out a fresh QR code and lock out whoever played before.
type Hub struct {
	mu         sync.RWMutex
	game       *client
	controller *client
	session    string
}

func NewHub() *Hub {
	return &Hub{}
}

func generateSessionToken() (string, error) {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buffer), nil
}

// rotateSession issues a new pairing token and evicts the controller paired with
// the old one. The game is told to release every held key, because the player
// holding them is gone.
func (hub *Hub) rotateSession() (string, error) {
	token, err := generateSessionToken()
	if err != nil {
		return "", err
	}

	hub.mu.Lock()
	hub.session = token
	staleController := hub.controller
	hub.controller = nil
	game := hub.game
	hub.mu.Unlock()

	if staleController != nil {
		staleController.close(websocket.StatusPolicyViolation, "pairing code was rotated")
		if game != nil {
			game.enqueueCritical(Message{Type: MessageTypeInputReset})
			game.enqueue(statusMessage(StatusControllerDisconnected))
		}
	}

	return token, nil
}

// resumeOrRotateSession keeps the pairing code alive when the game screen simply
// reconnected - a dropped socket on the big screen should not throw the phone off
// the controller. Anything else gets a fresh code.
func (hub *Hub) resumeOrRotateSession(requested string) (string, error) {
	hub.mu.RLock()
	current := hub.session
	hub.mu.RUnlock()

	if requested != "" && requested == current {
		return current, nil
	}
	return hub.rotateSession()
}

func (hub *Hub) authorizeController(session string) error {
	hub.mu.RLock()
	current := hub.session
	hub.mu.RUnlock()

	if current == "" || session != current {
		return errSessionMismatch
	}
	return nil
}

func (hub *Hub) register(newClient *client) {
	var replacedClient *client
	var peer *client

	hub.mu.Lock()
	switch newClient.role {
	case RoleGame:
		replacedClient = hub.game
		hub.game = newClient
		peer = hub.controller
	case RoleController:
		replacedClient = hub.controller
		hub.controller = newClient
		peer = hub.game
	}
	hub.mu.Unlock()

	if replacedClient != nil && replacedClient != newClient {
		replacedClient.close(websocket.StatusPolicyViolation, "replaced by a new connection")
	}

	newClient.enqueue(statusMessage(StatusConnected))

	if peer == nil {
		return
	}

	if newClient.role == RoleController {
		// Every controller transition resets the game's held keys. Without this a
		// silently dead phone leaves its last direction pressed forever.
		peer.enqueueCritical(Message{Type: MessageTypeInputReset})
		peer.enqueue(statusMessage(StatusControllerConnected))
		newClient.enqueue(statusMessage(StatusGameConnected))
		return
	}

	newClient.enqueue(statusMessage(StatusControllerConnected))
	peer.enqueue(statusMessage(StatusGameConnected))
}

func (hub *Hub) unregister(disconnectedClient *client) {
	var peer *client
	var removed bool

	hub.mu.Lock()
	switch disconnectedClient.role {
	case RoleGame:
		if hub.game == disconnectedClient {
			hub.game = nil
			peer = hub.controller
			removed = true
		}
	case RoleController:
		if hub.controller == disconnectedClient {
			hub.controller = nil
			peer = hub.game
			removed = true
		}
	}
	hub.mu.Unlock()

	if !removed || peer == nil {
		return
	}

	if disconnectedClient.role == RoleController {
		peer.enqueueCritical(Message{Type: MessageTypeInputReset})
		peer.enqueue(statusMessage(StatusControllerDisconnected))
	} else {
		peer.enqueue(statusMessage(StatusGameDisconnected))
	}
}

func (hub *Hub) forwardInput(sender *client, message Message) error {
	hub.mu.RLock()
	activeController := hub.controller
	game := hub.game
	hub.mu.RUnlock()

	if sender != activeController {
		return errControllerNotActive
	}
	if game == nil {
		return errGameNotConnected
	}
	if !game.enqueue(message) {
		return errGameNotResponding
	}

	return nil
}
