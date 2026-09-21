package realtime

import "testing"

func TestValidateJoin(t *testing.T) {
	tests := []struct {
		name    string
		message Message
		wantErr bool
	}{
		{name: "game", message: Message{Type: MessageTypeJoin, Role: RoleGame}},
		{name: "controller", message: Message{Type: MessageTypeJoin, Role: RoleController}},
		{name: "wrong type", message: Message{Type: MessageTypeInput, Role: RoleGame}, wantErr: true},
		{name: "unknown role", message: Message{Type: MessageTypeJoin, Role: "spectator"}, wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := test.message.ValidateJoin()
			if (err != nil) != test.wantErr {
				t.Fatalf("ValidateJoin() error = %v, wantErr %v", err, test.wantErr)
			}
		})
	}
}

func TestValidateInput(t *testing.T) {
	pressed := true
	tests := []struct {
		name    string
		message Message
		wantErr bool
	}{
		{name: "up", message: Message{Type: MessageTypeInput, Key: InputKeyUp, Pressed: &pressed}},
		{name: "down", message: Message{Type: MessageTypeInput, Key: InputKeyDown, Pressed: &pressed}},
		{name: "old jump key", message: Message{Type: MessageTypeInput, Key: "jump", Pressed: &pressed}, wantErr: true},
		{name: "missing pressed", message: Message{Type: MessageTypeInput, Key: InputKeyLeft}, wantErr: true},
		{name: "wrong type", message: Message{Type: MessageTypeStatus, Key: InputKeyLeft, Pressed: &pressed}, wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := test.message.ValidateInput()
			if (err != nil) != test.wantErr {
				t.Fatalf("ValidateInput() error = %v, wantErr %v", err, test.wantErr)
			}
		})
	}
}

func TestValidateInputReset(t *testing.T) {
	pressed := true
	if err := (Message{Type: MessageTypeInputReset}).ValidateInputReset(); err != nil {
		t.Fatalf("valid input_reset rejected: %v", err)
	}
	if err := (Message{Type: MessageTypeInputReset, Pressed: &pressed}).ValidateInputReset(); err == nil {
		t.Fatal("input_reset with pressed field was accepted")
	}
}
