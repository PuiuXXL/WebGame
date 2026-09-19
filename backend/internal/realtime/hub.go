package realtime

import (
	"errors"
	"sync"

	"github.com/coder/websocket"
)

var (
	errControllerNotActive = errors.New("controller connection is not active")
	errGameNotConnected    = errors.New("game is not connected")
	errGameNotResponding   = errors.New("game connection is not responding")
)

type Hub struct {
	mu         sync.RWMutex
	game       *client
	controller *client
}

func NewHub() *Hub {
	return &Hub{}
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

	newClient.enqueue(statusMessage("connected"))
	if peer != nil {
		if newClient.role == RoleController {
			peer.enqueue(statusMessage("controller_connected"))
		} else {
			newClient.enqueue(statusMessage("controller_connected"))
		}
	}
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
		peer.enqueue(Message{Type: MessageTypeInputReset})
		peer.enqueue(statusMessage("controller_disconnected"))
	} else {
		peer.enqueue(statusMessage("game_disconnected"))
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
