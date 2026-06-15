import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000;

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

app.get("/", async (req, res) => {
    let result = await db.query("SELECT * FROM books");
    let books = result.rows;
    
    for (let i = 0; i < books.length; i++) {
        const bookId = books[i].id
        const result = await getNewCover(books[i].olid, bookId);
        books[i].cover = result;
    }

    result = await db.query("SELECT * FROM books");
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
        await db.query("DELETE * FROM books WHERE id = ($1)", [bookId]);
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

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})