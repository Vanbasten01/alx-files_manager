// utils/db.js

import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}/${database}`;

    this.client = new MongoClient(url, { useUnifiedTopology: true });

    this.client.connect();
  }

  async isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    if (!this.client.isConnected()) {
      throw new Error('Database connection is not established.');
    }

    const db = this.client.db();
    const usersCollection = db.collection('users');
    return usersCollection.countDocuments();
  }

  async nbFiles() {
    if (!this.client.isConnected()) {
      throw new Error('Database connection is not established.');
    }

    const db = this.client.db();
    const filesCollection = db.collection('files');
    return filesCollection.countDocuments();
  }
}

const dbClient = new DBClient();
export default dbClient;
