package main

import (
	"fmt"
	"./controllers"
)

func main() {
	user := controllers.GetUserProfile(1)
	fmt.Printf("Started Go server with user: %+v\n", user)
}
