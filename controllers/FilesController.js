import dbClient from "../utils/db";
import redisClient from "../utils/redis";
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import fs from 'fs';

// Function to insert a new file document into the database
const insertFile = async (newFile) => {
    try {
        // Insert the new file document into the database
        const files = await dbClient.db.collection('files');
        const createdFile = await files.insertOne(newFile);
        if (createdFile.result.ok === 1 && createdFile.ops.length > 0) {
        // Return the new file with status code 201
        const [{ _id, userId, name, type, isPublic, parentId }] = createdFile.ops;
        const result = {
            id: _id, // Convert ObjectId to string for response
            userId: userId, // Convert ObjectId to string for response
            name,
            type,
            isPublic,
            parentId: parentId// Convert ObjectId to string for response
        }
        return result;
    }
       
    } catch (error) {
        throw new Error(`Error inserting file into database: ${error.message}`);
    }
};

export default class FilesController {
    static async postUpload(req, res) {
        try {
            const token = req.headers['x-token'];
            const userId = await redisClient.get(`auth_${token}`);
            
            // Check if user ID is found
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Extract request body parameters
            const { name } = req.body;
            const { type } = req.body;
            let { parentId } = req.body;
            const { isPublic } = req.body;
            const { data } = req.body;
            const types = ['folder', 'file', 'image'];
      
            // Validate request parameters
            if (!name) {
                return res.status(400).json({ error: 'Missing name' });
            }
            if (!type || !['folder', 'file', 'image'].includes(type)) {
                return res.status(400).json({ error: 'Missing or invalid type' });
            }
            if (type !== 'folder' && !data) {
                return res.status(400).json({ error: 'Missing data' });
            }
            if (!parentId) { parentId = 0}
            // If parentId is set, validate and find the parent file/folder
            if (parentId !== 0) {
                const parentFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) });
                if (!parentFile) {
                    return res.status(400).json({ error: 'Parent not found' });
                }
                if (parentFile.type !== 'folder') {
                    return res.status(400).json({ error: 'Parent is not a folder' });
                }
            }

            // Store the file locally and retrieve the local path
            let localPath = '';
            if (type !== 'folder') {
                console.log('here i m ')
                // Determine the folder path based on the environment variable or use the default path
                const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
                // Ensure the directory exists, create if it doesn't
                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true }); // Creates directory recursively if it doesn't exist
                }
                const fileName = uuidv4();
                localPath = `${folderPath}/${fileName}`;
                const fileData = Buffer.from(data, 'base64');
                fs.writeFileSync(localPath, fileData);
            }

            // Construct the new file document
            const newFile = {
                userId: ObjectId(userId), // Convert userId to ObjectId
                name,
                type,
                parentId: parentId !== 0 ? ObjectId(parentId) : 0, // Convert parentId to ObjectId
                isPublic,
                localPath: type !== 'folder' ? localPath : null
            };

            // Insert the new file document into the database
            const result = await insertFile(newFile);

            // Return the new file with status code 201
            return res.status(201).json(result);
        } catch (error) {
            console.error('Error creating file:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async getShow(req, res) {
        try {
            const token = req.header('x-token');
            if (!token) return res.status(401).json({ error: 'Unauthorized' });

            const userId = await redisClient.get(`auth_${token}`);
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const fileId = req.params.id;
        
            const filesCollection = await dbClient.db.collection('files');
            const file = await filesCollection.findOne({ _id: ObjectId(fileId), userId: userId });
            if (!file) return res.status(404).json({ error: 'Not found' });
            // Exclude localPath from the response
            delete file.localPath;
            const { _id, ...fileData } = file;
            const responseFile = { id: _id, ...fileData };

            return res.json(responseFile);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async getIndex(req, res) {
        try {
            const token = req.header('x-token');
            if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
            const userId = await redisClient.get(`auth_${token}`);
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
            const parentId = req.query.parentId || '0'; // Retrieve parentId from query parameters
            const page = parseInt(req.query.page, 10) || 0;
            const limit = 20;
            const skip = page * limit;
    
            const filesCollection = dbClient.db.collection('files');
            
            // Check if parentId is provided in the query parameters
            if (!req.query.parentId) {
                const files = await filesCollection.find({ userId: userId })
                                                    .skip(skip)
                                                    .limit(limit)
                                                    .toArray();
                // Rename _id to id and exclude localPath
                const responseFiles = files.map(file => {
                delete file.localPath;
                const { _id, parentId, ...fileData } = file;
                return { id: _id, parentId: parentId === '0' ? 0 : parentId, ...fileData };
            });
                return res.json(responseFiles);
            }
    
            // If parentId is provided, return files associated with userId and parentId
            const files = await filesCollection.find({ userId: userId, parentId: parentId })
                                                .skip(skip)
                                                .limit(limit)
                                                .toArray();
            const responseFiles = files.map(file => {
                delete file.localPath;
                const { _id,parentId, ...fileData} = file;
                return { id: _id, parentId: parentId === "0" ? 0 : parentId, ...fileData };
            })
            return res.json(responseFiles);
    
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    
}
