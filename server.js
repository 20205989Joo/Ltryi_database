const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb');

const app = express();

// CORS를 모든 요청에 대해 허용
app.use(cors());

// JSON 형식의 본문을 처리할 수 있게 설정
app.use(express.json());

// MariaDB 연결 설정
const pool = mariadb.createPool({
  host: 'localhost',
  user: 'root',
  password: 'abcdepik15_', // MariaDB 비밀번호
  database: 'ltryi_database',
  connectionLimit: 5
});

// POST 요청 처리
app.post('/api/saveResults', async function (req, res) {
    console.log("Received POST /api/saveResults");
    console.log("Request body:", req.body);

    try {
        const conn = await pool.getConnection();
        const query = "INSERT INTO results (resultsHtml, testCount) VALUES (?, ?)";
        const values = [req.body.resultsHtml, req.body.testCount];
        const result = await conn.query(query, values);
        conn.release();
        console.log("Insert result:", result);
        res.status(200).json({ message: 'Results saved successfully', data: req.body });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Failed to save results' });
    }
});

// 서버 시작
app.listen(3000, function () {
    console.log('CORS-enabled web server listening on port 3000');
});
