package realtime

import (
	"context"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

const writeTimeout = 5 * time.Second

type client struct {
	role      Role
	conn      *websocket.Conn
	send      chan Message
	done      chan struct{}
	closeOnce sync.Once
}

func newClient(role Role, conn *websocket.Conn) *client {
	return &client{
		role: role,
		conn: conn,
		send: make(chan Message, 16),
		done: make(chan struct{}),
	}
}

func (client *client) enqueue(message Message) bool {
	select {
	case <-client.done:
		return false
	case client.send <- message:
		return true
	default:
		return false
	}
}

// enqueueCritical delivers a message that must not be dropped, such as input_reset.
// A client whose queue stays full for the whole write timeout cannot be kept in sync,
// so it is torn down instead of being left holding stale keys.
func (client *client) enqueueCritical(message Message) {
	timer := time.NewTimer(writeTimeout)
	defer timer.Stop()

	select {
	case <-client.done:
	case client.send <- message:
	case <-timer.C:
		client.closeNow()
	}
}

func (client *client) writeLoop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-client.done:
			return
		case message := <-client.send:
			writeContext, cancel := context.WithTimeout(ctx, writeTimeout)
			err := wsjson.Write(writeContext, client.conn, message)
			cancel()
			if err != nil {
				client.closeNow()
				return
			}
		}
	}
}

func (client *client) close(status websocket.StatusCode, reason string) {
	client.closeOnce.Do(func() {
		close(client.done)
		if client.conn != nil {
			_ = client.conn.Close(status, reason)
		}
	})
}

func (client *client) closeNow() {
	client.closeOnce.Do(func() {
		close(client.done)
		if client.conn != nil {
			client.conn.CloseNow()
		}
	})
}
