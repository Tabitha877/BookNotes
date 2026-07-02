//import the required modules
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import http from "http";
import https from "https";

const app = express();
const port = 3000;

// set the agents for HTTP and HTTPS requests to keep connections alive
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

// configure axios with agents
const axiosInstance = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 10000
});


// set database connection parameters
const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "BookNotes",
    password: "PosT973_L",
    port: 5432,
});

// make connection to the database
db.connect();

// initialize body-parser
app.use(bodyParser.urlencoded({ extended: true }));
// static files will be served from the "public" directory
app.use(express.static("public"));

// get the cover for a book based on its Open Library ID (olid) and update the database if the cover is missing
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

// fetch book data from Open Library API based on the title
async function fetchData(title) {
    let bookOptions = [];
    let bookCovers = [];

    // get the book-info for the books with a matching title
    let url = `https://openlibrary.org/search.json?title=${title}&limit=15`;
    url = url.replace(/ /g, '+');

    let response = await axiosInstance.get(url);
    bookOptions = response.data.docs;

    // get the book covers for the books with a matching title
    for(let i = 0; i < bookOptions.length; i++) {
        const urlCover = `https://covers.openlibrary.org/b/olid/${bookOptions[i].cover_edition_key}-M.jpg`;
        bookCovers[i] = urlCover;
    }

    return {
        bookCovers,
        bookOptions
    }
}

// get the home-page and display the books in the database, if specified order by status (name, rating, or recency)
app.get("/", async (req, res) => {
    let result;
    
    // get books from database
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

// get more information about a specific book based on its ID and render the book-note page
app.get("/notes", async (req, res) => {
    const bookId = req.query.bookId;
    const result = await db.query("SELECT * FROM books WHERE id = ($1)", [bookId]);
    const selectedBook = result.rows[0];
    
    res.render("book-note.ejs", {
        book: selectedBook,
    });
})

// delete a book from the database based on its ID and redirect to the home-page
app.get("/delete", async (req, res) => {
    const bookId = req.query.bookId;

    try {
        await db.query("DELETE FROM books WHERE id = ($1)", [bookId]);
    } catch (error) {
        console.log(error)
    }

    res.redirect("/");
});

// go to the edit page for a specific book based on its ID
app.get("/edit", async (req, res) => {
    const bookId = req.query.bookId;
    const result = await db.query("SELECT * FROM books WHERE id = ($1)", [bookId]);
    const selectedBook = result.rows[0];

    res.render('edit.ejs', {
        book: selectedBook,
    });
});

// update book information and redirect to the home-page
app.post("/edit", async (req, res) => {
    // get the updated book information from the request body
    const bookId = req.body.bookId;
    const updatedTitle = req.body.updatedTitle;
    const updatedRating = parseFloat(req.body.updatedRating);
    const updatedReview = req.body.updatedReview;
    const updatedDate = req.body.updatedDate;

    // update the book information in the database
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

// go to the add page to add a new book
app.get("/add", (req, res) => {
    res.render("add.ejs", {
        showOptions: false,
    });
});

// add a new book to the database with all the information from the request body and redirect to the home-page
app.post("/add", async (req, res) => {
    try {
        await db.query("INSERT INTO books (title, rating, review, olid, date) VALUES ($1, $2, $3, $4, $5)", [req.body.title, req.body.rating, req.body.review, req.body.olid, req.body.date]);
    } catch(error) {
        console.log(error);
    }
    res.redirect("/");
});

// search for a book by title using the Open Library API and render the add page with the search results
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

// go back to the add page and fill in the title of the selected book and store its olid
app.get('/select', (req, res) => {
    const title = req.query.bookTitle;
    const olid = req.query.olid;

    res.render("add.ejs", {
        title: title,
        olid: olid
    });
});

// go back to the add page and clear all information
app.get("/cancel", (req, res) => {
    res.redirect('/add');
});

//search for books in the database based on the search input and render the home-page with the search results
app.post("/search", async (req, res) => {
    // get the search input from the request body
    const input = req.body.search;
    let books;

    // search for books in the database based on the search input
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