import User from "../models/user.js";

export async function listUsers(_request, response) {
  const users = await User.find().select("name");
  response.json(users);
}
