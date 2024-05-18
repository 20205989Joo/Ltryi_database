const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb');

const app = express();

app.use(express.json());
app.use(cors()); // CORS를 모든 요청에 대해 허용

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10
});

// 결과 저장 API
app.post('/api/saveResults', async function (req, res) {
    console.log("Received POST /api/saveResults");
    const { userId, results } = req.body;

    try {
        const conn = await pool.getConnection();

        for (const result of results) {
            const subjectQuery = "SELECT SubjectId FROM Subjects WHERE SubjectName = ?";
            const [subject] = await conn.query(subjectQuery, [result.subjectName]);
            if (!subject) {
                throw new Error(`Subject not found for name: ${result.subjectName}`);
            }

            const subcategoryQuery = "SELECT SubcategoryId FROM Subcategories WHERE SubcategoryName = ? AND SubjectId = ?";
            const [subcategory] = await conn.query(subcategoryQuery, [result.subcategoryName, subject.SubjectId]);
            if (!subcategory) {
                throw new Error(`Subcategory not found for name: ${result.subcategoryName} and subject ID: ${subject.SubjectId}`);
            }

            // 결과 저장
            const insertQuery = "INSERT INTO Results (UserId, SubcategoryId, QuizNo, UserResponse, CorrectAnswer, Correctness, Timestamp, TestCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            const insertValues = [userId, subcategory.SubcategoryId, result.quizNo, result.userResponse, result.correctAnswer, result.correctness, result.timestamp, result.testCount];
            await conn.query(insertQuery, insertValues);

        }

        conn.release();
        res.status(200).json({ message: 'Results saved successfully' });
    } catch (error) {
        console.error('Database error:', error);
        conn.release();
        res.status(500).json({ message: 'Failed to save results', error: error.message });
    }
});

// 특정 사용자의 결과 조회 API
app.post('/api/getResults', async function (req, res) {
    console.log("Received POST /api/getResults");
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'Invalid request body' });
    }

    try {
        const conn = await pool.getConnection();
        const query = `
            SELECT R.*, S.SubjectName, SC.SubcategoryName
            FROM Results R
            JOIN Subcategories SC ON R.SubcategoryId = SC.SubcategoryId
            JOIN Subjects S ON SC.SubjectId = S.SubjectId
            WHERE R.UserId = ?
        `;
        const results = await conn.query(query, [userId]);
        conn.release();
        res.status(200).json(results);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Failed to fetch results', error: error.message });
    }
});

// 모든 결과 조회 API
app.get('/api/getAllResults', async function (req, res) {
    console.log("Received GET /api/getAllResults");
    try {
        const conn = await pool.getConnection();
        const query = `
            SELECT R.*, S.SubjectName, SC.SubcategoryName
            FROM Results R
            JOIN Subcategories SC ON R.SubcategoryId = SC.SubcategoryId
            JOIN Subjects S ON SC.SubjectId = S.SubjectId
        `;
        const results = await conn.query(query);
        conn.release();
        res.status(200).json(results);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Failed to fetch all results', error: error.message });
    }
});

// 특정 사용자의 결과 초기화 API
app.post('/api/resetResults', async function (req, res) {
    console.log("Received POST /api/resetResults");
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'Invalid request body' }); // 올바른 상태 코드 함수 호출 형식으로 수정
    }

    try {
        const conn = await pool.getConnection();
        const query = "DELETE FROM Results WHERE UserId = ?";
        await conn.query(query, [userId]);
        conn.release();
        res.status(200).json({ message: `All results have been reset for user: ${userId}` });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Failed to reset results', error: error.message });
    }
});


// 모든 결과 초기화 API
app.post('/api/resetAllResults', async function (req, res) {
    console.log("Received POST /api/resetAllResults");
    try {
        const conn = await pool.getConnection();
        const query = "TRUNCATE TABLE Results";
        await conn.query(query);
        conn.release();
        res.status(200).json({ message: 'All results have been reset' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Failed to reset all results', error: error.message });
    }
});

// 서버 시작
app.listen(3000, function () {
    console.log('Server listening on port 3000');
});
