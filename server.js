const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const mongoose = require('mongoose');
const argon2 = require('argon2');
const session = require('express-session');
const multer = require('multer');
const path = require('path');

const app = express();

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI,)
mongoose.connection.on('connected', () => {
    console.log(`Connected to MongoDB ${mongoose.connection.name}.`)
});

// Models
const User = require('./models/user.js');
const Post = require('./models/post');
const Review = require('./models/review');

// multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 15 * 1024 * 1024
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'video/mp4') {
            cb(null, true)
        } else {
            cb(new Error('File type not allowed. Only images and mp4 videos are allowed.'))
        }
    }
});

// Middleware
app.use(express.urlencoded({ extended: false }))
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: false
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null
    next()
});

app.use(express.static(path.join(__dirname, 'public')))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next()
    } else {
        return res.redirect('/signin')
    }
};

// ROUTES

// Home 
app.get('/', async (req, res) => {
    if (req.session.user) {
        try {
            const foundUser = await User.findById(req.session.user._id)
            const recentSearches = foundUser ? foundUser.recentSearches : []
            res.render('index.ejs', { recentSearches, user: req.session.user })
        } catch (err) {
            console.error(err)
            res.status(500).send('Error loading home page.')
        }
    } else {
        res.render('index.ejs', { recentSearches: [], user: null })
    }
});

// User Sign Up
app.get('/signup', (req, res) => {
    res.render('users/signup.ejs')
});

app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body

    try {
        if (!username || !email || !password) {
            return res.status(400).send('Please provide a username, email, and password.')
        }

        const hashedPassword = await argon2.hash(password)
        const newUser = new User({ username, email, password: hashedPassword })

        await newUser.save()
        req.session.user = newUser
        res.redirect('/')
    } catch (err) {
        console.error(err)

        if (err.code === 11000) {
            if (err.keyPattern.email) {
                return res.status(400).send('Email already exists.')
            }
            if (err.keyPattern.username) {
                return res.status(400).send('Username already exists.')
            }
        }

        res.status(500).send('Error creating user.')
    }
});

// User Sign In
app.get('/signin', (req, res) => {
    res.render('users/signin.ejs')
});

app.post('/signin', async (req, res) => {
    const { username, password } = req.body

    try {
        const foundUser = await User.findOne({ username })
        if (!foundUser) {
            return res.status(400).send("User not found. <a href='/signup'>Sign up</a>")
        }

        const match = await argon2.verify(foundUser.password, password)
        if (!match) {
            return res.status(400).send('Invalid password.')
        }

        req.session.user = foundUser
        res.redirect('/')
    } catch (err) {
        console.error(err)
        res.status(500).send('Error signing in, try again.')
    }
});

// User Sign Out
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error logging out.')
        }
        res.redirect('/signin')
    })
});

app.post('/search', isAuthenticated, async (req, res) => {
    const { searchTerm } = req.body

    try {
        const user = await User.findById(req.session.user._id)
        if (user) {
            user.recentSearches.unshift(searchTerm)
            if (user.recentSearches.length > 5) {
                user.recentSearches.pop()
            }
            await user.save()
        }
        res.redirect('/search/results')
    } catch (err) {
        console.error(err)
        res.status(500).send('Error saving search.')
    }
});

//Posts
app.get('/posts', isAuthenticated, async (req, res) => {
    try {
        const posts = await Post.find({ createdBy: req.session.user._id }).populate('reviews')
        res.render('posts/posts.ejs', { posts })
    } catch (err) {
        console.error(err)
        res.status(500).send('Error loading posts.')
    }
});

app.get('/posts/:id/view', isAuthenticated, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate('createdBy', 'username').populate('reviews')
        if (post) {
            res.render('posts/view-posts.ejs', { post })
        } else {
            res.status(404).send('Post not found.')
        }
    } catch (err) {
        console.error(err)
        res.status(500).send('Error loading post.')
    }
});

// New Posts
app.get('/posts/new', isAuthenticated, (req, res) => {
    res.render('posts/new-post.ejs')
});

app.post('/posts/new', isAuthenticated, upload.fields([{ name: 'photos' }, { name: 'video' }]), async (req, res) => {
    const { country, city, startDate, endDate, writtenText } = req.body

    try {
        if (!startDate || !endDate) {
            return res.status(400).send('Start date and end date are required.')
        }

        const photos = req.files['photos'] ? req.files['photos'].map(file => file.path) : []
        const video = req.files['video'] ? req.files['video'][0].path : null

        const newPost = new Post({
            country,
            city,
            startDate,
            endDate,
            writtenText,
            photos,
            video,
            createdBy: req.session.user._id
        });

        await newPost.save()
        res.redirect('/posts')
    } catch (err) {
        console.error(err)
        res.status(500).send('Error creating post.')
    }
});

//Edit Post
app.get('/posts/:id/edit', isAuthenticated, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
        if (post && post.createdBy.equals(req.session.user._id)) {
            res.render('posts/edit-post.ejs', { post })
        } else {
            res.status(403).send('Unauthorized to edit this post.')
        }
    } catch (err) {
        console.error(err)
        res.status(500).send('Error loading edit form.')
    }
});

app.post('/posts/:id/edit', isAuthenticated, upload.fields([{ name: 'photos' }, { name: 'video' }]), async (req, res) => {
    const { country, city, startDate, endDate, writtenText } = req.body

    try {
        const post = await Post.findById(req.params.id)
        if (post && post.createdBy.equals(req.session.user._id)) {
            post.country = country
            post.city = city
            post.startDate = startDate
            post.endDate = endDate
            post.writtenText = writtenText

            if (req.files['photos']) {
                post.photos = req.files['photos'].map(file => file.path)
            }

            if (req.files['video']) {
                post.video = req.files['video'][0].path
            }

            await post.save()
            res.redirect('/posts')
        } else {
            res.status(403).send('Unauthorized to edit this post.')
        }
    } catch (err) {
        console.error(err)
        res.status(500).send('Error updating post.')
    }
});


// Delete Post
app.post('/posts/:id/delete', isAuthenticated, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
        if (post && post.createdBy.equals(req.session.user._id)) {
            await Post.deleteOne({ _id: req.params.id })
            res.redirect('/posts')
        } else {
            res.status(403).send('Unauthorized to delete this post.')
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting post.')
    }
});

app.get('/search', isAuthenticated, (req, res) => {
    res.render('searches/search.ejs')
});

app.get('/searches/search-results', isAuthenticated, async (req, res) => {
    const searchTerm = req.query.query

    try {
        const posts = await Post.find({
            $or: [
                { country: { $regex: searchTerm, $options: 'i' } },
                { city: { $regex: searchTerm, $options: 'i' } }
            ],
            createdBy: { $ne: req.session.user._id } 
        }).populate('createdBy', 'username')

        res.render('searches/search-results.ejs', { posts, query: searchTerm })
    } catch (err) {
        console.error(err);
        res.status(500).send('Error searching posts.')
    }
});

app.post('/posts/:id/reviews', isAuthenticated, async (req, res) => {
    const { content, rating } = req.body

    try {
        const post = await Post.findById(req.params.id)
        if (!post) {
            return res.status(404).send('Post not found.')
        }

        const newReview = new Review({ content, rating, post: post._id })
        await newReview.save()

        post.reviews.push(newReview._id);
        await post.save();

        res.redirect(`/posts/${post._id}/view`)
    } catch (err) {
        console.error(err)
        res.status(500).send('Error adding review.')
    }
});



app.listen(3000, () => {
    console.log('Listening on port 3000')
});
