const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const MongoClient = require('mongodb').MongoClient;
const uri = 'mongodb+srv://12260590:admin123@cluster0.kkepkjp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri);

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

let userCollection;
let postCollection;

async function connectDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas\n");

        const db = client.db('travel_sekai');
        userCollection = db.collection('users');
        postCollection = db.collection('posts');
    } catch (error) {
        console.error("MongoDB connection error: ", error + "\n");
    }
};

connectDB();

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// verify user email and password during login
app.post('/verifyCredentials', async (req, res) => {
    console.log("POST request received successfully!");

    const userData = req.body;

    console.log(userData);
    try {
        const response = await userCollection.findOne({ email: userData.email, password: userData.password });
        console.log(`User find response: ${JSON.stringify(response)}`);
        res.status(200).send(JSON.stringify(response));
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error })
    }

});

// check if the email is registered in the database before creating a new account
app.get('/checkUserEmail', async (req, res) => {
    console.log("GET request received successfully!");

    const userEmail = req.query.email;;

    try {
        const response = await userCollection.findOne({ email: userEmail });
        console.log(`Response: ${JSON.stringify(response)}`);
        res.status(200).send(JSON.stringify(response));
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error });
    }
});

// create new user
app.post('/createNewUser', upload.single('userImage'), async (req,res) => {
    console.log("POST request received successfully");

    const user = req.body;

    let binaryValueOfImage = null;
    let contentType = null;

    if (req.file) {
        binaryValueOfImage = req.file.buffer;
        contentType = req.file.mimetype;
    }

    const userData = {
        _id: Math.trunc(Math.random()*900000 + 100000),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: user.password,
        userImage: binaryValueOfImage ? {
            contentType: contentType,
            data: binaryValueOfImage
        } : null,
        dob: user.dob
    }

    try {
        const response = await userCollection.insertOne( userData );
        console.log(JSON.stringify(response));
        res.status(200).send(JSON.stringify(response));
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error });
    }
});


// retrieve all the posts
app.get('/posts', async (req, res) => {
    console.log("GET request received successfully!");

    try {
        const response = await postCollection.find({}).toArray();
        console.log(`posts: ${JSON.stringify(response)}`);
        res.status(200).send(JSON.stringify(response));
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error });
    }
    
});


// retrieve one post using the post id
app.get('/posts/:id', async (req, res) => {
    console.log("GET request received successfully!");

    const postID = req.params.id;

    try {
        const response = await postCollection.findOne({ _id: postID });
        console.log(`Post with ID ${postID}: ${JSON.stringify(response)}`);
        res.status(200).send(JSON.stringify(response));
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error });
    }
});


// retrieve posts created by user
app.get('/getUserPosts/:userId', async (req, res) => {
    console.log("GET request received successfully!");

    const userID = req.params.userId;

    console.log("User ID: " + userID);

    try {
        const response = await postCollection.find({ userID: userID }, {projection: {images: 0}}).toArray();
        console.log(`Posts: ${JSON.stringify(response)}`);
        res.status(200).send(JSON.stringify(response));
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error });
    }
});


// create new post
app.post('/createPost', upload.any(), async (req, res) => {
    console.log("POST request received successfully!");

    const post = req.body;
    const imagefiles = req.files;

    console.log("Uploaded files: ", imagefiles.map(file => file.fieldname));

    const sectionImages = {};

    imagefiles.forEach(file => {
        const field = file.fieldname;

        if (!sectionImages[field]) {
            sectionImages[field] = [];
        }

        sectionImages[field].push({
            filename: file.originalname,
            contentType: file.mimetype,
            binaryValueOfImage: file.buffer
        });
    });

    const journeys = JSON.parse(post.journeys || '[]');

    const routeData = journeys.map((journey, index) => {
        const sectionKey = `section_${index}_images`;
        return {
            locationName: journey.locationName,
            description: journey.description,
            images: sectionImages[sectionKey] || [],
            modeOfTransport: journey.transportMode,
            distanceAndTime: journey.distanceAndTime,
            startDate: journey.startDate,
            endDate: journey.endDate
        }
    });

    const postData = {
        postTitle: post.postTitle,
        date: post.date,
        route: routeData,
        accommodation: post.accommodation,
        userID: post.userID
    };

    try {
        const response = await postCollection.insertOne(postData);
        console.log(JSON.stringify(response));
        res.status(200).send(JSON.stringify(response));
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error });
    }
});

app.listen(port, () => {
    console.log(`App is running on port ${port}`);
});