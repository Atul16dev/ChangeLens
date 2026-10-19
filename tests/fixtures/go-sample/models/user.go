package models

import "fmt"

type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

func (u *User) String() string {
	return fmt.Sprintf("User(%d, %s)", u.ID, u.Username)
}
