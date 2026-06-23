import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_DB_URI}/${DB_NAME}`);

        console.log(`\n MongoDB Connected ! DB host: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MongoDB connection error" , error);
        process.exit(1)
    }
}

export default connectDB

// In DB connection always chances of errors 
// Use try catch | always expect errors
// Database is always in another continent
// Database always takes time so use use async await