/* eslint-disable import/no-named-as-default */
import sha1 from 'sha1';
import dbClient from '../utils/db';


class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const collection = dbClient.db.collection('users');
    const userExists = await collection.findOne({ email });

    if (userExists) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const hashedPassword = sha1(password);
    const newUser = {
      email,
      password: hashedPassword,
    };

    try {
      const { insertedId } = await collection.insertOne(newUser);
      const user = {
        id: insertedId,
        email,
      };
      return res.status(201).json(user);
    } catch (error) {
      console.error('Error creating new user:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };


  static async getMe(req, res) {
    const { user } = req;
  
    // Check if user object is present
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  
    // If user object is present, return user information
    res.status(200).json({ email: user.email, id: user._id.toString() });
  }
}

export default UsersController;
