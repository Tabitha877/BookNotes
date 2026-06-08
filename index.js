import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000;

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "World",
    password: "PosT973_L",
    port: 5432,
});



db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let bookImageExistsCache = {
    
};

let books = [
    {
        id: 1,
        title: "braaf",
        rating: 4.5,
        date: "2024-06-01",
        review: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer malesuada sollicitudin dictum. Donec euismod lorem et accumsan tincidunt. Nunc maximus ipsum lacus, et laoreet enim iaculis in. Donec varius finibus dui non ultrices. Donec placerat suscipit purus at porttitor. Sed quis tempor ex. Ut pretium mauris at tincidunt fermentum. Vestibulum volutpat sapien eget felis lobortis bibendum. Suspendisse finibus consequat risus, mollis aliquam lorem vehicula et.",
        cover: "",
        olid: "OL40215390M",
    },
    {
        id: 2,
        title: "de jongen in de gestreepte pyjama",
        rating: 4.8,
        date: "2023-12-15",
        review: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris blandit a lorem et blandit. Aenean at elit at ipsum tristique molestie nec non lectus. Ut felis turpis, vulputate in neque in, dapibus fermentum mi. Phasellus eget ex scelerisque, iaculis dui et, dignissim sem. Donec pellentesque maximus sollicitudin. Morbi ut turpis placerat, tincidunt est eu, pretium turpis. Aenean sed lectus magna. Duis et odio eget ligula porta porttitor. Nullam dolor nibh, venenatis at elit sit amet, mattis accumsan massa. In vitae urna ut diam aliquet egestas. Sed porttitor imperdiet efficitur. Ut lobortis suscipit nisi, sed mollis mi dignissim non. Quisque ullamcorper ex arcu, ut consequat enim semper eget. Phasellus augue enim, blandit id molestie non, efficitur dictum velit. Etiam viverra imperdiet arcu, at scelerisque ipsum condimentum in. Nulla fermentum ipsum ut lacinia mollis. Ut porttitor volutpat nisl non eleifend. Nulla id ex quis diam rhoncus bibendum. Pellentesque at efficitur quam.",
        cover: "",
        olid: "OL47191563M",
    }
]

async function getCover(olid) {

    if(bookImageExistsCache[olid] == undefined) {
        try {
            const response = await axios.get(`https://covers.openlibrary.org/b/olid/${olid}-L.jpg`);
            bookImageExistsCache[olid] = true;
        }
        catch (error) {
            bookImageExistsCache[olid] = false;
        }
    }
    
    const exists = bookImageExistsCache[olid];
    if(exists) {
        return `https://covers.openlibrary.org/b/olid/${olid}-L.jpg`;
    }
    else {
        return "https://placehold.co/250x400";
    }
}

app.get("/", async (req, res) => {
    for (let i = 0; i < books.length; i++) {
        const result = await getCover(books[i].olid);
        books[i].cover = result;
    }
    res.render("index.ejs", {
        books: books,
    });
});

app.get("/notes", async (req, res) => {
    const bookId = req.query.bookId;
    const book = books.find((book) => book.id == bookId);
    const cover = await getCover(book.olid);

    res.render("book-note.ejs", {
        book: book,
        cover: cover,
    });
})

app.get("/edit", (req, res) => {
    const bookId = req.query.bookId;
    const book = books.find((book) => book.id == bookId);
    res.render('edit.ejs', {
        book: book,
    });
});

app.post("/edit", (req, res) => {
   const bookId = req.query.bookId;
   const oldBookInfo = books.find((book) => book.id == bookId);
   console.log(req.body);
//    const updatedBookInfo = {
//         id: bookId,
//         title: req.body.updatedTitle || oldBookInfo.title,
//         content: req.body.updatedReview || oldBookInfo.review,
//         author: req.body.updatedRating || oldBookInfo.rating,
//         date: req.body.updatedDate,
//     }

});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})