package realtime

import (
	"testing"
	"time"
)

func TestHubForwardsControllerInputToGame(t *testing.T) {
	hub := NewHub()
	game := newClient(RoleGame, nil)
	controller := newClient(RoleController, nil)
	hub.register(game)
	hub.register(controller)
	drainMessages(game)
	drainMessages(controller)

	pressed := true
	input := Message{Type: MessageTypeInput, Key: InputKeyUp, Pressed: &pressed}
	if err := hub.forwardInput(controller, input); err != nil {
		t.Fatalf("forwardInput() error = %v", err)
	}

	message := receiveMessage(t, game)
	if message.Type != MessageTypeInput || message.Key != InputKeyUp || message.Pressed == nil || !*message.Pressed {
		t.Fatalf("received message = %#v, want up pressed", message)
	}
}

func TestHubResetsInputWhenControllerDisconnects(t *testing.T) {
	hub := NewHub()
	game := newClient(RoleGame, nil)
	controller := newClient(RoleController, nil)
	hub.register(game)
	hub.register(controller)
	drainMessages(game)
	drainMessages(controller)

	hub.unregister(controller)

	reset := receiveMessage(t, game)
	if reset.Type != MessageTypeInputReset {
		t.Fatalf("first message type = %q, want %q", reset.Type, MessageTypeInputReset)
	}
	status := receiveMessage(t, game)
	if status.Type != MessageTypeStatus || status.Status != StatusControllerDisconnected {
		t.Fatalf("second message = %#v, want controller_disconnected status", status)
	}
}

// A phone that dies silently is never unregistered, so the reset has to happen when
// the next controller takes its place - otherwise the game keeps the old held keys.
func TestHubResetsInputWhenControllerIsReplaced(t *testing.T) {
	hub := NewHub()
	game := newClient(RoleGame, nil)
	first := newClient(RoleController, nil)
	hub.register(game)
	hub.register(first)
	drainMessages(game)

	second := newClient(RoleController, nil)
	hub.register(second)

	reset := receiveMessage(t, game)
	if reset.Type != MessageTypeInputReset {
		t.Fatalf("first message type = %q, want %q", reset.Type, MessageTypeInputReset)
	}
}

func TestHubReplacesExistingController(t *testing.T) {
	hub := NewHub()
	first := newClient(RoleController, nil)
	second := newClient(RoleController, nil)
	hub.register(first)
	hub.register(second)

	select {
	case <-first.done:
	case <-time.After(time.Second):
		t.Fatal("replaced controller was not closed")
	}
}

func TestHubTellsControllerTheGameIsConnected(t *testing.T) {
	hub := NewHub()
	game := newClient(RoleGame, nil)
	controller := newClient(RoleController, nil)
	hub.register(game)
	hub.register(controller)

	if first := receiveMessage(t, controller); first.Status != StatusConnected {
		t.Fatalf("first controller message = %#v, want connected", first)
	}
	if second := receiveMessage(t, controller); second.Status != StatusGameConnected {
		t.Fatalf("second controller message = %#v, want game_connected", second)
	}
}

func TestHubAuthorizesOnlyTheCurrentSession(t *testing.T) {
	hub := NewHub()

	if err := hub.authorizeController("anything"); err == nil {
		t.Fatal("authorizeController() accepted a code before any session existed")
	}

	first, err := hub.rotateSession()
	if err != nil {
		t.Fatalf("rotateSession() error = %v", err)
	}
	if err := hub.authorizeController(first); err != nil {
		t.Fatalf("authorizeController(current) error = %v", err)
	}

	second, err := hub.rotateSession()
	if err != nil {
		t.Fatalf("rotateSession() error = %v", err)
	}
	if first == second {
		t.Fatal("rotateSession() returned the same token twice")
	}
	if err := hub.authorizeController(first); err == nil {
		t.Fatal("authorizeController() still accepted the rotated-out code")
	}
}

func TestHubResumesTheSessionForAReconnectingGame(t *testing.T) {
	hub := NewHub()

	first, err := hub.resumeOrRotateSession("")
	if err != nil {
		t.Fatalf("resumeOrRotateSession() error = %v", err)
	}

	resumed, err := hub.resumeOrRotateSession(first)
	if err != nil {
		t.Fatalf("resumeOrRotateSession(current) error = %v", err)
	}
	if resumed != first {
		t.Fatal("a reconnecting game was handed a new pairing code instead of its own")
	}

	replaced, err := hub.resumeOrRotateSession("some-other-code")
	if err != nil {
		t.Fatalf("resumeOrRotateSession(stale) error = %v", err)
	}
	if replaced == first {
		t.Fatal("an unknown pairing code did not trigger a rotation")
	}
}

func TestHubRotationEvictsTheOldController(t *testing.T) {
	hub := NewHub()
	game := newClient(RoleGame, nil)
	controller := newClient(RoleController, nil)
	hub.register(game)
	hub.register(controller)
	drainMessages(game)

	if _, err := hub.rotateSession(); err != nil {
		t.Fatalf("rotateSession() error = %v", err)
	}

	select {
	case <-controller.done:
	case <-time.After(time.Second):
		t.Fatal("rotating the session did not close the paired controller")
	}

	if reset := receiveMessage(t, game); reset.Type != MessageTypeInputReset {
		t.Fatalf("game message after rotation = %#v, want input_reset", reset)
	}
}

func drainMessages(client *client) {
	for {
		select {
		case <-client.send:
		default:
			return
		}
	}
}

func receiveMessage(t *testing.T, client *client) Message {
	t.Helper()
	select {
	case message := <-client.send:
		return message
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for message")
		return Message{}
	}
}
