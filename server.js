const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb');

const app = express();

// CORS를 모든 요청에 대해 허용
app.use(cors());

// JSON 형식의 본문을 처리할 수 있게 설정
app.use(express.json());

// 환경 변수에서 MariaDB 연결 설정 가져오기
const pool = mariadb.createPool({
  host: process.env.DB_HOST, // 환경 변수에서 데이터베이스 호스트 가져오기
  user: process.env.DB_USER, // 환경 변수에서 데이터베이스 사용자명 가져오기
  password: process.env.DB_PASSWORD, // 환경 변수에서 데이터베이스 비밀번호 가져오기
  database: process.env.DB_NAME, // 환경 변수에서 데이터베이스 이름 가져오기
  connectionLimit: 5
});

// POST 요청 처리 (결과 저장)
app.post('/api/saveResults', async function (req, res) {
    console.log("Received POST /api/saveResults");
    console.log("Request body:", req.body);

    const { userId, subject, subcategory, quizNo, userResponse, correctness, resultsHtml, testCount } = req.body;

    if (!userId || !subject || !subcategory || quizNo === undefined || !userResponse || correctness === undefined || !resultsHtml || !testCount) {
        return res.status(400).json({ message: 'Invalid request body' });
    }

    try {
        const conn = await pool.getConnection();
        const query = "INSERT INTO results (userId, subject, subcategory, quizNo, userResponse, correctness, resultsHtml, testCount, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' '); // 현재 시간 생성
        const values = [userId, subject, subcategory, quizNo, userResponse, correctness, resultsHtml, testCount, timestamp];
        const result = await conn.query(query, values);
        conn.release();
        console.log("Insert result:", result);
        res.status(200).json({ message: 'Results saved successfully', data: req.body });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Failed to save results' });
    }
});


// POST 요청 처리 (결과 조회)
app.post('/api/getResults', async function (req, res) {
    console.log("Received POST /api/getResults");

    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'Invalid request body' });
    }

    try {
        const conn = await pool.getConnection();
        const query = "SELECT userId, subject, subcategory, quizNo, userResponse, correctness, resultsHtml, testCount, timestamp FROM results WHERE userId = ?";
        const results = await conn.query(query, [userId]);
        conn.release();
        console.log("Fetch result:", results);
        res.status(200).json(results);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Failed to fetch results' });
    }
});

// GET 요청 처리 (모든 결과 조회)
app.get('/api/getAllResults', async function (req, res) {
    console.log("Received GET /api/getAllResults");

    try {
        const conn = await pool.getConnection();
        const query = "SELECT userId, subject, subcategory, quizNo, userResponse, correctness, resultsHtml, testCount, timestamp FROM results";
        const results = await conn.query(query);
        conn.release();
        console.log("Fetch all results:", results);
        res.status(200).json(results);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Failed to fetch all results' });
    }
});

// POST 요청 처리 (결과 초기화)
app.post('/api/resetResults', async function (req, res) {
    console.log("Received POST /api/resetResults");

    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'Invalid request body' });
    }

    try {
        const conn = await pool.getConnection();
        const query = "DELETE FROM results WHERE userId = ?";
        await conn.query(query, [userId]);
        conn.release();
        console.log("All results have been reset for user:", userId);
        res.status(200).json({ message: `All results have been reset for user: ${userId}` });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Failed to reset results' });
    }
});

// POST 요청 처리 (모든 결과 초기화)
app.post('/api/resetAllResults', async function (req, res) {
    console.log("Received POST /api/resetAllResults");

    try {
        const conn = await pool.getConnection();
        const query = "TRUNCATE TABLE results";
        await conn.query(query);
        conn.release();
        console.log("All results have been reset");
        res.status(200).json({ message: 'All results have been reset' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Failed to reset all results' });
    }
});

// 서버 시작
app.listen(3000, function () {
    console.log('CORS-enabled web server listening on port 3000');
});
