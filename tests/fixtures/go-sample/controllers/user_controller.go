package controllers

import (
	"../models"
)

func GetUserProfile(id int) *models.User {
	return &models.User{
		ID:       id,
		Username: "gopher",
		Email:    "gopher@golang.org",
	}
}
