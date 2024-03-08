# Files Manager API

This repository contains an API for managing files. It provides endpoints for uploading, listing, publishing, unpublishing files, and more.

## Getting Started

To get started with the Files Manager API, follow these steps:

1. Clone this repository:

   ```bash
   git clone https://github.com/Vanbasten01/alx-files_manager.git
   ```

2. Navigate to the project directory:

   ```bash
   cd alx-files_manager
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the server:

   ```bash
   npm start
   ```

## Utils

### Redis

The `redis.js` file inside the `utils` folder contains the RedisClient class, which interacts with Redis for caching.

#### RedisClient Class

- **Constructor**: Creates a client to Redis. Any errors encountered by the Redis client will be displayed in the console.
- **isAlive()**: Returns `true` when the connection to Redis is successful; otherwise, returns `false`.
- **get(key)**: Asynchronously retrieves the Redis value stored for the specified key.
- **set(key, value, duration)**: Asynchronously stores the specified key-value pair in Redis with an expiration set by the duration argument.
- **del(key)**: Asynchronously removes the value in Redis for the specified key.

### MongoDB

The `db.js` file inside the `utils` folder contains the DBClient class, which interacts with MongoDB.

#### DBClient Class

- **Constructor**: Creates a client to MongoDB with configurable host, port, and database.
- **isAlive()**: Returns `true` when the connection to MongoDB is successful; otherwise, returns `false`.
- **nbUsers()**: Asynchronously returns the number of documents in the `users` collection.
- **nbFiles()**: Asynchronously returns the number of documents in the `files` collection.

## API Endpoints

### Status

- **GET /status**: Returns the status of Redis and MongoDB connections.

### Stats

- **GET /stats**: Returns the number of users and files in the database.

### Users

- **POST /users**: Creates a new user in the database. Requires an email and password.

### Authentication

- **GET /connect**: Sign-in a user by generating a new authentication token.
- **GET /disconnect**: Sign-out a user based on the token.
- **GET /users/me**: Retrieve the user based on the token used.

### Files

- **POST /files**: Creates a new file in the database and on disk. Supports various file types.
- **GET /files/:id**: Retrieve a file document based on the ID.
- **GET /files**: Retrieve all user file documents for a specific parentId with pagination.
- **PUT /files/:id/publish**: Sets a file as public.
- **PUT /files/:id/unpublish**: Sets a file as private.
- **GET /files/:id/data**: Retrieve the content of a file based on the ID and size.

## Usage

To use the API endpoints, make HTTP requests to the specified routes using tools like cURL or Postman.

## Worker

The `worker.js` file starts a background processing for generating thumbnails for image files uploaded through the API.

## Contributing

Contributions are welcome! Feel free to open issues or pull requests.

## License

This project is licensed under the MIT License.
