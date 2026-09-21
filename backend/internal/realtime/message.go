package realtime

import "fmt"

type MessageType string
type Role string
type InputKey string

const (
	MessageTypeJoin       MessageType = "join"
	MessageTypeInput      MessageType = "input"
	MessageTypeInputReset MessageType = "input_reset"
	MessageTypeStatus     MessageType = "status"
	MessageTypeError      MessageType = "error"

	RoleGame       Role = "game"
	RoleController Role = "controller"

	InputKeyLeft   InputKey = "left"
	InputKeyRight  InputKey = "right"
	InputKeyUp     InputKey = "up"
	InputKeyDown   InputKey = "down"
	InputKeyAction InputKey = "action"
)

type Message struct {
	Type    MessageType `json:"type"`
	Role    Role        `json:"role,omitempty"`
	Key     InputKey    `json:"key,omitempty"`
	Pressed *bool       `json:"pressed,omitempty"`
	Status  string      `json:"status,omitempty"`
	Code    string      `json:"code,omitempty"`
	Message string      `json:"message,omitempty"`
}

func (message Message) ValidateJoin() error {
	if message.Type != MessageTypeJoin {
		return fmt.Errorf("first message must have type %q", MessageTypeJoin)
	}

	if message.Role != RoleGame && message.Role != RoleController {
		return fmt.Errorf("unknown client role %q", message.Role)
	}

	return nil
}

func (message Message) ValidateInput() error {
	if message.Type != MessageTypeInput {
		return fmt.Errorf("message type must be %q", MessageTypeInput)
	}

	if !isValidInputKey(message.Key) {
		return fmt.Errorf("unknown input key %q", message.Key)
	}

	if message.Pressed == nil {
		return fmt.Errorf("pressed must be a boolean")
	}

	return nil
}

func (message Message) ValidateInputReset() error {
	if message.Type != MessageTypeInputReset {
		return fmt.Errorf("message type must be %q", MessageTypeInputReset)
	}
	if message.Key != "" || message.Pressed != nil || message.Role != "" || message.Status != "" || message.Code != "" || message.Message != "" {
		return fmt.Errorf("input_reset must not contain other fields")
	}
	return nil
}

func isValidInputKey(key InputKey) bool {
	switch key {
	case InputKeyLeft, InputKeyRight, InputKeyUp, InputKeyDown, InputKeyAction:
		return true
	default:
		return false
	}
}

func statusMessage(status string) Message {
	return Message{Type: MessageTypeStatus, Status: status}
}

func errorMessage(code string, err error) Message {
	return Message{Type: MessageTypeError, Code: code, Message: err.Error()}
}
