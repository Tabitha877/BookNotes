import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import http from "http";
import https from "https";

const app = express();
const port = 3000;

// 1. Maak de agents aan BINNEN de globale scope
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

// 2. Configureer Axios met de agents
const axiosInstance = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 10000
});



const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "BookNotes",
    password: "PosT973_L",
    port: 5432,
});



db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


async function getNewCover(olid, bookId) {
    const url = `https://covers.openlibrary.org/b/olid/${olid}-L.jpg`;
    const noCover = await db.query("SELECT * FROM books WHERE cover IS NULL");
    if (noCover) {
        try {
            await db.query("UPDATE books SET cover = ($1) WHERE cover IS NULL AND id = ($2)", [url, bookId]);
        }
        catch (error) {
            console.log(error);
        }
    } 
}

async function fetchData(title) {
    let bookOptions = [];
    let bookCovers = [];

    // get the book-info for the books with a matching title
    let url = `https://openlibrary.org/search.json?title=${title}&limit=15`;
    url = url.replace(/ /g, '+');

    let response = await axiosInstance.get(url);
    bookOptions = response.data.docs;

    for(let i = 0; i < bookOptions.length; i++) {
        const urlCover = `https://covers.openlibrary.org/b/olid/${bookOptions[i].cover_edition_key}-M.jpg`;
        bookCovers[i] = urlCover;
    }

    return {
        bookCovers,
        bookOptions
    }
}

app.get("/", async (req, res) => {
    let result;
    
    result = await db.query("SELECT * FROM books");
    let books = result.rows;
    // Get the book covers
    for (let i = 0; i < books.length; i++) {
        const bookId = books[i].id
        const result = await getNewCover(books[i].olid, bookId);
        books[i].cover = result;
    }
    
    // Order books by specified status
    let order = req.query.status;
    if (order === 'name') {
        result = await db.query("Select * FROM books ORDER BY title");
    } else if (order === 'rating') {
        result = await db.query("Select * FROM books ORDER BY rating DESC");
    } else if (order === 'recency') {
        result = await db.query("SELECT * FROM books ORDER BY date")
    } else {
        result = await db.query("SELECT * FROM books");
    }
    books = result.rows;

    res.render("index.ejs", {
        books: books,
    });
});

app.get("/notes", async (req, res) => {
    const bookId = req.query.bookId;
    const result = await db.query("SELECT * FROM books WHERE id = ($1)", [bookId]);
    const selectedBook = result.rows[0];
    
    res.render("book-note.ejs", {
        book: selectedBook,
    });
})

app.get("/delete", async (req, res) => {
    const bookId = req.query.bookId;

    try {
        await db.query("DELETE FROM books WHERE id = ($1)", [bookId]);
    } catch (error) {
        console.log(error)
    }

    res.redirect("/");
});

app.get("/edit", async (req, res) => {
    const bookId = req.query.bookId;
    const result = await db.query("SELECT * FROM books WHERE id = ($1)", [bookId]);
    const selectedBook = result.rows[0];

    res.render('edit.ejs', {
        book: selectedBook,
    });
});

app.post("/edit", async (req, res) => {
    const bookId = req.body.bookId;
    const updatedTitle = req.body.updatedTitle;
    const updatedRating = parseFloat(req.body.updatedRating);
    const updatedReview = req.body.updatedReview;
    const updatedDate = req.body.updatedDate;

    try {
        await db.query(
            "UPDATE books SET title = $1, rating = $2, date = $3, review = $4 WHERE id = $5",
            [updatedTitle, updatedRating, updatedDate, updatedReview, bookId]
        );
    } catch (error) {
        console.log(error);
    }

    res.redirect("/")
});

app.get("/add", (req, res) => {
    res.render("add.ejs", {
        showOptions: false,
    });
});

app.post("/add", async (req, res) => {
    try {
        await db.query("INSERT INTO books (title, rating, review, olid, date) VALUES ($1, $2, $3, $4, $5)", [req.body.title, req.body.rating, req.body.review, req.body.olid, req.body.date]);
    } catch(error) {
        console.log(error);
    }
    res.redirect("/");
});

app.post("/searchBook", async (req, res) => {
    const bookTitle = req.body.title;
    let data;
    try {
        data = await fetchData(bookTitle);
    } catch (error) {
        console.log(error);
        res.send('error fetching data, try again later or go to <a href="/">home-page</a>')
    };

    res.render("add.ejs", {
        showBookCover: data.bookCovers,
        showBookInfo: data.bookOptions,
        showOptions: true,
        searchTitle: bookTitle
    });
});

app.get('/select', (req, res) => {
    const title = req.query.bookTitle;
    const olid = req.query.olid;

    res.render("add.ejs", {
        title: title,
        olid: olid
    });
});

app.get("/cancel", (req, res) => {
    res.redirect('/add');
});

app.post("/search", async (req, res) => {
    const input = req.body.search;
    let books;

    try {
        const result = await db.query("SELECT * FROM books WHERE LOWER(title) LIKE '%' || $1 || '%';", 
            [input.toLowerCase()]
        );
        books = result.rows;
    } catch (error) {
        console.log(error)
    }

    res.render("index.ejs", {
        books: books
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});