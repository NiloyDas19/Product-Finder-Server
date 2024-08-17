const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();
const port = process.env.PORT || 5000;
const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:5173'], // Adjust according to your frontend setup
}));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.x3wylq5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: false, // Set strict to false to allow legacy commands
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        const productsCollection = client.db("productsDB").collection('products');

        app.get("/products", async (req, res) => {

            const { page = 1, limit = 12, search = '', brand = '', category = '', priceRange = '', sort = '' } = req.query;
            const skip = (page - 1) * limit;

            const query = {};

            if (search) {
                query.productName = { $regex: search, $options: 'i' };
            }

            if (brand) {
                query.brandName = brand;
            }

            if (category) {
                query.category = category;
            }

            if (priceRange) {
                const [min, max] = priceRange.split('-').map(Number);
                if (max) {
                    query.price = { $gte: min, $lte: max };
                } else {
                    query.price = { $gte: min };
                }
            }

            const sortOptions = {};
            if (sort === 'priceAsc') {
                sortOptions.price = 1;
            } else if (sort === 'priceDesc') {
                sortOptions.price = -1;
            } else if (sort === 'dateDesc') {
                sortOptions.creationDateTime = -1;
            }

            try {
                const products = await productsCollection.find(query)
                    .sort(sortOptions)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .toArray();
                const totalProducts = await productsCollection.countDocuments(query);
                const totalPages = Math.ceil(totalProducts / limit);

                res.json({
                    products,
                    pagination: {
                        currentPage: page,
                        totalPages,
                        totalProducts,
                        perPage: limit
                    }
                });
            } catch (error) {
                console.log(error);
                res.status(500).json({ message: error.message });
            }
        });


        app.get("/brands", async (req, res) => {
            try {
                const brands = await productsCollection.distinct("brandName");
                res.json(brands);
            } catch (error) {
                console.log(error);
                res.status(500).json({ message: error.message });
            }
        });

        app.get("/categories", async (req, res) => {
            try {
                const categories = await productsCollection.distinct("category");
                res.json(categories);
            } catch (error) {
                console.log(error);
                res.status(500).json({ message: error.message });
            }
        });
        
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensuring that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Find product servr is running...!');
});

app.listen(port, () => {
    console.log(`Find product server is running on port: ${port}`);
});

