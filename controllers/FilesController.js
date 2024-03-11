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
            id: _id.toString(), // Convert ObjectId to string for response
            userId: userId.toString(), // Convert ObjectId to string for response
            name,
            type,
            isPublic,
            parentId: parentId === '0' ? 0 : parentId.toString(), // Convert ObjectId to string for response
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
            const { name, type, parentId = '0', isPublic = false, data } = req.body;

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

            // If parentId is set, validate and find the parent file/folder
            if (parentId !== '0') {
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
                userId: userId, // Convert userId to ObjectId
                name,
                type,
                parentId: parentId, // Convert parentId to ObjectId
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
            const file = await filesCollection.findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
            if (!file) return res.status(404).json({ error: 'Not found' });

            return res.json(file);
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
                return res.json(files);
            }
    
            // If parentId is provided, return files associated with userId and parentId
            const files = await filesCollection.find({ userId: userId, parentId: parentId })
                                                .skip(skip)
                                                .limit(limit)
                                                .toArray();
            return res.json(files);
    
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    
}
