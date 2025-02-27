const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    ScanCommand,
    UpdateCommand,
    DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const express = require("express");
const serverless = require("serverless-http");

const app = express();

const POSTS_TABLE = process.env.DYNAMODB_TABLE_NAME;
const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

app.use(express.json());

/**
 * 1. Get all posts
 */
app.get("/posts", async (req, res) => {
    const params = {
        TableName: POSTS_TABLE,
    };

    try {
        const command = new ScanCommand(params);
        const { Items } = await docClient.send(command);
        res.json({
            message: "Successfully retrieved all posts.",
            posts: Items,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to retrieve posts",
            error: error.message,
        });
    }
});

/**
 * 2. Get a single post by postId
 */
app.get("/posts/:postId", async (req, res) => {
    const params = {
        TableName: POSTS_TABLE,
        Key: { postId: req.params.postId },
    };

    try {
        const command = new GetCommand(params);
        const { Item } = await docClient.send(command);
        if (Item) {
            res.json({ message: "Successfully retrieved post.", post: Item });
        } else {
            res.status(404).json({ message: "Post not found" });
        }
    } catch (error) {
        res.status(500).json({
            message: "Failed to get post",
            error: error.message,
        });
    }
});

/**
 * 3. Create a new post
 */
app.post("/posts", async (req, res) => {
    const { postId, title, content, author } = req.body;
    if (!postId || !title || !content) {
        return res
            .status(400)
            .json({ message: "postId, title, and content are required" });
    }

    const params = {
        TableName: POSTS_TABLE,
        Item: { postId, title, content, author },
    };

    try {
        const command = new PutCommand(params);
        await docClient.send(command);
        res.json({ message: "Successfully created post.", post: params.Item });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to create post",
            error: error.message,
        });
    }
});

/**
 * 4. Update a post (Partial update)
 */
app.put("/posts/:postId", async (req, res) => {
    const { title, content, author } = req.body;
    const { postId } = req.params;

    const updateExpressionParts = [];
    const expressionAttributeValues = {};

    if (title) {
        updateExpressionParts.push("title = :title");
        expressionAttributeValues[":title"] = title;
    }
    if (content) {
        updateExpressionParts.push("content = :content");
        expressionAttributeValues[":content"] = content;
    }
    if (author) {
        updateExpressionParts.push("author = :author");
        expressionAttributeValues[":author"] = author;
    }

    if (updateExpressionParts.length === 0) {
        return res.status(400).json({ message: "Nothing to update" });
    }

    const params = {
        TableName: POSTS_TABLE,
        Key: { postId },
        UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
    };

    try {
        const command = new UpdateCommand(params);
        const { Attributes } = await docClient.send(command);
        res.json({ message: "Successfully updated post.", post: Attributes });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to update post",
            error: error.message,
        });
    }
});

/**
 * 5. Delete a post
 */
app.delete("/posts/:postId", async (req, res) => {
    const params = {
        TableName: POSTS_TABLE,
        Key: { postId: req.params.postId },
    };

    try {
        const command = new DeleteCommand(params);
        await docClient.send(command);
        res.json({ message: "Successfully deleted post." });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to delete post",
            error: error.message,
        });
    }
});

/**
 * Catch-all route for 404 errors
 */
app.use((req, res, next) => {
    return res.status(404).json({ error: "Not Found" });
});

exports.handler = serverless(app);
