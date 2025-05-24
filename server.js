const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb');
const multer = require('multer');
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:deathlyevil@gmail.com',
  'BEvKBnLcnotYEeOBexk0i-_2oK5aU3epudG8lszhppdiGeiDT2JPbkXF-THFDYXcWjiGNktD7gIOj4mE_MC_9nE',
  '5kA0Noc2rQyIPtWIaUUqNCJGXQSbnoMZZ4Nhc59nwzE'
);


const app = express();

app.use(express.json());
app.use(cors()); // CORS를 모든 요청에 대해 허용

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10
});

console.log("Supabase URL:", process.env.SUPABASE_URL);
console.log("Supabase ANON KEY:", process.env.SUPABASE_ANON_KEY);


const upload = multer(); // Multer 설정

// 결과 저장 API
app.post('/api/saveResults', async function (req, res) {
    console.log("Received POST /api/saveResults");
    const { userId, results } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction(); // 트랜잭션 시작

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
            const insertQuery = "INSERT INTO Results (UserId, SubcategoryId, QuizNo, UserResponse, CorrectAnswer, Correctness, Timestamp, TestCount, TestRange) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            const insertValues = [userId, subcategory.SubcategoryId, result.quizNo, result.userResponse, result.correctAnswer, result.correctness, result.timestamp, result.testCount, result.testRange];
            await conn.query(insertQuery, insertValues);
        }

        await conn.commit(); // 모든 쿼리가 성공적으로 실행되면 커밋
        res.status(200).json({ message: 'Results saved successfully' });
    } catch (error) {
        console.error('Database error:', error);
        if (conn) {
            await conn.rollback(); // 에러 발생 시 롤백
        }
        res.status(500).json({ message: 'Failed to save results', error: error.message });
    } finally {
        if (conn) {
            conn.release(); // 마지막에 항상 연결 해제
        }
    }
});

app.post('/api/saveGrades', async function (req, res) {
    console.log("Received POST /api/saveGrades");
    const { userId, grades } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        for (const grade of grades) {
            // SubcategoryName을 사용하여 SubcategoryId 조회
            const subcategoryQuery = "SELECT SubcategoryId FROM Subcategories WHERE SubcategoryName = ?";
            const [subcategory] = await conn.query(subcategoryQuery, [grade.subcategoryName]);
            
            if (!subcategory) {
                throw new Error(`Subcategory not found for name: ${grade.subcategoryName}`);
            }

            const subcategoryId = subcategory.SubcategoryId;

            // Grades 테이블에 데이터 저장
            const insertGradeQuery = "INSERT INTO Grades (UserId, SubcategoryId, QuizNo, TestScore, TestCount, WhichDay) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE TestScore = VALUES(TestScore), TestCount = VALUES(TestCount), WhichDay = VALUES(WhichDay)";
            const insertGradeValues = [userId, subcategoryId, grade.quizNo, grade.testScore, grade.testCount, grade.whichDay];
            await conn.query(insertGradeQuery, insertGradeValues);
        }

        await conn.commit();
        conn.release();
        res.status(200).json({ message: 'Grades saved successfully' });
    } catch (error) {
        console.error('Database error:', error);
        if (conn) {
            await conn.rollback();  // 롤백을 처리
        }
        res.status(500).json({ message: 'Failed to save grades', error: error.message });
    } finally {
        if (conn) {
            conn.release();  // 연결 해제를 확실하게 처리
        }
    }
});

function safeSupabaseKey(input) {
  return encodeURIComponent(input).replace(/%/g, '');
}

app.post('/api/saveHWImages', upload.single('HWImage'), async function (req, res) {
  const {
    UserId, QLevel, QYear, QMonth, QNo, WhichHW, QGrade, Comment
  } = req.body;

  const HWImage = req.file ? req.file.buffer : null;
  if (!HWImage) return res.status(400).json({ message: "No image uploaded" });

  const mimeType = req.file.mimetype;

  const base = `${UserId}_${QLevel}_${QYear}_${QMonth}_${QNo}_${WhichHW}`;
  const safeBase = safeSupabaseKey(base);

  let fileName = `${safeBase}.jpg`;
  let suffix = 1;

  // ✅ 중복된 파일명 방지 루프
  while (true) {
    const { data: existing, error: checkError } = await supabase
      .storage
      .from('hw-images')
      .list('', { search: fileName });

    if (!existing || existing.length === 0) break;

    fileName = `${safeBase}(${suffix}).jpg`;
    suffix++;
  }

  try {
    const { data, error } = await supabase.storage
      .from('hw-images')
      .upload(fileName, HWImage, {
        contentType: mimeType,
        upsert: false  // ✅ 덮어쓰기 방지
      });

    if (error) throw error;

    const imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/hw-images/${fileName}`;

    let conn;
    try {
      conn = await pool.getConnection();
      const insertQuery = `
        INSERT INTO HWImages 
        (UserId, QLevel, QYear, QMonth, QNo, WhichHW, QGrade, Comment, HWImageURL, Timestamp) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      await conn.query(insertQuery, [
        UserId, QLevel, QYear, QMonth, QNo, WhichHW, QGrade || null, Comment || null, imageUrl
      ]);
      conn.release();
    } catch (dbError) {
      console.error("DB insert error:", dbError);
    }

    res.status(200).json({ message: 'HW Image uploaded to Supabase', url: imageUrl });
  } catch (error) {
    console.error('Supabase or DB error:', error);
    res.status(500).json({ message: 'Failed to upload HW Image', error: error.message });
  }
});




  
  



// CustomWordsList 저장 API
app.post('/api/saveCustomWordsList', async function (req, res) {
    console.log("Received POST /api/saveCustomWordsList");
    const { UserId, QLevel, QYear, QMonth, QNo, CustomWord, CustomMeaning } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();
        const insertQuery = "INSERT INTO CustomWordsList (UserId, QLevel, QYear, QMonth, QNo, CustomWord, CustomMeaning) VALUES (?, ?, ?, ?, ?, ?, ?)";
        await conn.query(insertQuery, [UserId, QLevel, QYear, QMonth, QNo, CustomWord, CustomMeaning]);
        conn.release();
        res.status(200).json({ message: 'Custom Words List saved successfully' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Failed to save Custom Words List', error: error.message });
    } finally {
        if (conn) {
            conn.release();
        }
    }
});

// HWImages 조회 API
app.get('/api/getHWImages', async function (req, res) {
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const conn = await pool.getConnection();
    const query = `
      SELECT 
        UserId, QLevel, QYear, QMonth, QNo, WhichHW, QGrade, Comment, HWImageURL, Timestamp
      FROM HWImages
      WHERE UserId = ?
    `;
    const images = await conn.query(query, [userId]);
    conn.release();

    if (images.length === 0) {
      res.status(404).json({ message: 'No images found for this user' });
    } else {
      res.status(200).json(images);
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'Failed to fetch images', error: error.message });
  }
});

  

// CustomWordsList 조회 API
app.get('/api/getCustomWordsList', async function (req, res) {
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        const conn = await pool.getConnection();
        const query = `
            SELECT * FROM CustomWordsList WHERE UserId = ?
        `;
        const wordsList = await conn.query(query, [userId]);
        conn.release();

        if (wordsList.length === 0) {
            res.status(404).json({ message: 'No words list found for this user' });
        } else {
            res.status(200).json(wordsList);
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Failed to fetch words list', error: error.message });
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
            SELECT R.*, G.TestScore, S.SubjectName, SC.SubcategoryName
            FROM Results R
            JOIN Grades G ON R.UserId = G.UserId AND R.SubcategoryId = G.SubcategoryId AND R.QuizNo = G.QuizNo
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

app.get('/api/getGrades', async function (req, res) {
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        const conn = await pool.getConnection();
        const query = `
            SELECT G.UserId, G.SubcategoryId, SC.SubcategoryName, G.QuizNo, G.TestScore, G.TestCount, G.WhichDay
            FROM Grades G
            JOIN Subcategories SC ON G.SubcategoryId = SC.SubcategoryId
            WHERE G.UserId = ?
            ORDER BY G.QuizNo;
        `;
        const grades = await conn.query(query, [userId]);
        conn.release();

        if (grades.length === 0) {
            res.status(404).json({ message: 'No grades found for this user' });
        } else {
            res.status(200).json(grades);
        }
    } catch (error) {
        console.error('Database error:', error);
        conn.release();
        res.status(500).json({ message: 'Failed to fetch grades', error: error.message });
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
        return res.status(400).json({ message: 'Invalid request body' });
    }

    try {
        const conn = await pool.getConnection();
        await conn.beginTransaction();
        const deleteResultsQuery = "DELETE FROM Results WHERE UserId = ?";
        await conn.query(deleteResultsQuery, [userId]);
        const deleteGradesQuery = "DELETE FROM Grades WHERE UserId = ?";
        await conn.query(deleteGradesQuery, [userId]);
        await conn.commit();
        conn.release();
        res.status(200).json({ message: `All results have been reset for user: ${userId}` });
    } catch (error) {
        await conn.rollback();
        console.error('Database error:', error);
        res.status(500).json({ message: 'Failed to reset results', error: error.message });
    }
});

// 모든 결과 초기화 API
app.post('/api/resetAllResults', async function (req, res) {
    console.log("Received POST /api/resetAllResults");
    try {
        const conn = await pool.getConnection();
        await conn.beginTransaction();
        const truncateResultsQuery = "TRUNCATE TABLE Results";
        await conn.query(truncateResultsQuery);
        const truncateGradesQuery = "TRUNCATE TABLE Grades";
        await conn.query(truncateGradesQuery);
        await conn.commit();
        conn.release();
        res.status(200).json({ message: 'All results and grades have been reset' });
    } catch (error) {
        await conn.rollback();
        console.error('Database error:', error);
        res.status(500).json({ message: 'Failed to reset all results and grades', error: error.message });
    }
});

const subscriptions = [];

app.post('/api/save-subscription', async (req, res) => {
  const { userId, subscription } = req.body;
  if (!userId || !subscription?.endpoint) {
    return res.status(400).json({ message: 'Invalid input' });
  }

  try {
    const conn = await pool.getConnection();

    const query = `
      INSERT INTO PushSubscriptions (UserId, Endpoint, AuthKey, P256dhKey)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        Endpoint = VALUES(Endpoint),
        AuthKey = VALUES(AuthKey),
        P256dhKey = VALUES(P256dhKey),
        UpdatedAt = CURRENT_TIMESTAMP
    `;

    await conn.query(query, [
      userId,
      subscription.endpoint,
      subscription.keys.auth,
      subscription.keys.p256dh
    ]);

    conn.release();
    res.status(200).json({ message: 'Saved' });
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});




app.get('/api/send-push', (req, res) => {
  const payload = JSON.stringify({
    title: '📣 숙제 도착!',
    body: '오늘의 단어 퀴즈를 풀어보세요!'
  });

  subscriptions.forEach(sub => {
    webpush.sendNotification(sub, payload)
      .then(() => console.log('✅ 푸시 알림 전송 완료'))
      .catch(err => console.error('❌ 전송 실패:', err));
  });

  res.send('🚀 푸시 전송 시도 완료');
});



// 서버 시작
app.listen(3000, function () {
    console.log('Server listening on port 3000');
});
