const dotenv = require("dotenv")
dotenv.config()
const express = require("express")
const mongoose = require("mongoose")
const argon2 = require('argon2')
const app = express();


mongoose.connect(process.env.MONGODB_URI)
mongoose.connection.on("connected", () => {
    console.log(`Connected to MongoDB ${mongoose.connection.name}.`)
  });


  //Models
  const User = require("./models/user.js")
  const Post = require("./models/post")
  const Review = require("./models/review")

  //Middleware
  app.use(express.urlencoded({ extended: false }))

// ROUTES

// Home
app.get("/", async (req, res) => {
    res.render("index.ejs")
});

// GET (SIGN UP) 
app.get("/users/signup", (req, res) => {
    res.render("users/signup.ejs") 
});

// POST (SIGN UP)
app.post("/signup", async (req, res) => {
    const { username, password } = req.body

    try {
        const hashedPassword = await argon2.hash(password)
        console.log("Hashed Password:", hashedPassword)

        const newUser = new User({
            username,
            password: hashedPassword,
        })

        await newUser.save()
        res.render("users/welcome.ejs", { username: newUser.username })
    } catch (err) {
        console.error(err);
        res.status(500).send("Error creating user.")
    }
});

// GET (SIGN IN)
app.get("/signin", (req, res) => {
    res.render("users/signin.ejs")
});

// POST (SIGN IN)
app.post("/signin", async (req, res) => {
    const { username, password } = req.body;

    try {
        const foundUser = await User.findOne({ username })
        console.log("Found User:", foundUser)

        if (!foundUser || !foundUser.password) {
            return res.status(400).send("User not found or password not set.")
        }

       
        const match = await argon2.verify(foundUser.password, password)
        if (!match) {
            return res.status(400).send("Invalid password.")
        }

        res.redirect("/")
    } catch (err) {
        console.error(err)
        res.status(500).send("Error signing in, try again.")
    }
});



// GET all posts
app.get("/posts", async (req, res) => {
    try {
        const posts = await Post.find().populate("reviews")
        res.render("posts.ejs", { posts })
    } catch (err) {
        console.error(err)
        res.status(500).send("Error loading posts.")
    }
});

// POST - new post
app.post("/posts", async (req, res) => {
    const { country, city, timeOfYear } = req.body
    try {
        const newPost = new Post({ country, city, timeOfYear })
        await newPost.save()
        res.redirect("/posts")
    } catch (err) {
        console.error(err)
        res.status(500).send("Error creating post.")
    }
});

app.post("/posts/:id/reviews", async (req, res) => {
    const { content, rating } = req.body
    try {
        const post = await Post.findById(req.params.id)
        const newReview = new Review({ content, rating })
        post.reviews.push(newReview)
        await post.save()
        await newReview.save()
        res.redirect(`/posts`)
    } catch (err) {
        console.error(err)
        res.status(500).send("Error adding review.")
    }
});


app.listen(3000, () => {
  console.log("Listening on port 3000")
});