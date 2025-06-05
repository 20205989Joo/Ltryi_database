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
app.use(express.static('public'));

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




app.post('/api/send-push', async (req, res) => {
  const { userId, title, body } = req.body;
  if (!userId || !title || !body) {
    return res.status(400).json({ message: 'Invalid input' });
  }

  try {
    const conn = await pool.getConnection();

    const result = await conn.query(
      'SELECT * FROM PushSubscriptions WHERE UserId = ?',
      [userId]
    );

    conn.release();

    // 🔍 디버깅용 로그 추가
    console.log('쿼리 결과:', result);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: 'No subscription found for this userId' });
    }

    const row = result[0]; // ✅ 첫 행만 추출

    const sub = {
      endpoint: row.Endpoint,
      keys: {
        auth: row.AuthKey,
        p256dh: row.P256dhKey
      }
    };

    const payload = JSON.stringify({ title, body });

    await webpush.sendNotification(sub, payload);

    console.log(`✅ ${userId}에게 푸시 전송 완료`);
    res.status(200).json({ message: 'Push sent' });

  } catch (err) {
    console.error('❌ 푸시 전송 실패:', err);
    res.status(500).json({ message: 'Push error', error: err.message });
  }
});

// Tutorial Id 최신 받아오고 +1해서 부여
app.post('/api/grant-tutorial-id', async (req, res) => {
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ message: 'Invalid subscription object' });
  }

  try {
    const conn = await pool.getConnection();

    // 1. 이미 동일 endpoint가 존재하는지 확인
    const [existing] = await conn.query(
      `SELECT UserId FROM PushSubscriptions WHERE Endpoint = ? LIMIT 1`,
      [subscription.endpoint]
    );

    if (existing && existing.UserId) {
      conn.release();
      return res.status(200).json({ userId: existing.UserId });
    }

    // 2. tutorial% ID 중 가장 높은 숫자 찾기
    const results = await conn.query(`
      SELECT UserId FROM PushSubscriptions WHERE UserId LIKE 'tutorial%'
    `);

    let max = 0;
    for (const row of results) {
      const match = row.UserId.match(/^tutorial(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num)) max = Math.max(max, num);
      }
    }

    const newId = `tutorial${max + 1}`;

    // 3. 새 subscription 저장
    await conn.query(`
      INSERT INTO PushSubscriptions (UserId, Endpoint, AuthKey, P256dhKey)
      VALUES (?, ?, ?, ?)
    `, [
      newId,
      subscription.endpoint,
      subscription.keys.auth,
      subscription.keys.p256dh
    ]);

    conn.release();
    res.status(200).json({ userId: newId });

  } catch (err) {
    console.error('grant-tutorial-id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// <------- 여기부터는 회원가입과 로그인 등등등

app.post('/api/register', async (req, res) => {
  const {
    userId,
    password,
    tutorialIds,
    phoneNumber,
    deadline,
    createdAt,
    isRegistered,
    coin,
    userType,
    name,
    birthYear,
    guardianContact,
    connectedTo
  } = req.body;

  // ✅ 필수 항목 검증
  if (
    !userId ||
    !password ||
    !Array.isArray(tutorialIds) ||
    !userType ||
    !name ||
    !birthYear ||
    !connectedTo // ✅ 보호자 or 자녀 ID 필요
  ) {
    return res.status(400).json({ message: '누락된 필수 정보가 있습니다.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    // ✅ 중복 ID 검사
    const [existing] = await conn.query("SELECT UserId FROM UserInfo WHERE UserId = ?", [userId]);
    if (existing) {
      conn.release();
      return res.status(409).json({ message: '이미 존재하는 ID입니다.' });
    }

    // ✅ INSERT 쿼리
    const insertQuery = `
      INSERT INTO UserInfo
      (UserId, Password, TutorialIds, PhoneNumber, Deadline, CreatedAt, IsRegistered, Coin, UserType, Name, BirthYear, GuardianContact, ConnectedTo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await conn.query(insertQuery, [
      userId,
      password,
      tutorialIds.join(','),
      phoneNumber || null,
      deadline || '20:00:00',
      createdAt || new Date(),
      isRegistered ?? 0,
      coin ?? 0,
      userType,
      name,
      birthYear,
      guardianContact || null,
      connectedTo
    ]);

    conn.release();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ 회원가입 실패:', error);
    if (conn) conn.release();
    res.status(500).json({ message: '서버 오류', error: error.message });
  }
});





app.post('/api/login', async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ message: 'userId와 password를 입력하세요.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const query = `
      SELECT UserId, UserType FROM UserInfo
      WHERE UserId = ? AND Password = ?
      LIMIT 1
    `;
    const result = await conn.query(query, [userId, password]);

    if (result.length > 0) {
      res.status(200).json({
        userId: result[0].UserId,
        userType: result[0].UserType
      });
    } else {
      res.status(401).json({ message: 'ID 또는 비밀번호가 일치하지 않습니다.' });
    }
  } catch (err) {
    console.error('❌ 로그인 오류:', err);
    res.status(500).json({ message: '서버 오류', error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/whosmychild', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ message: "userId 누락" });

  try {
    const conn = await pool.getConnection();
    const query = `SELECT ConnectedTo FROM UserInfo WHERE UserId = ? LIMIT 1`;
    const [result] = await conn.query(query, [userId]);
    conn.release();

    if (!result || !result.ConnectedTo) {
      return res.status(404).json({ message: "연결된 자녀 정보 없음" });
    }

    res.status(200).json({ childId: result.ConnectedTo });
  } catch (err) {
    console.error("❌ whosmychild 오류:", err);
    res.status(500).json({ message: "서버 오류", error: err.message });
  }
});




app.post('/api/login-subscription-check', async (req, res) => {
  const { userId, subscription } = req.body;

  if (!userId || !subscription || !subscription.endpoint) {
    console.warn("❌ 잘못된 요청: userId 또는 subscription 누락");
    return res.status(400).json({ message: 'Invalid input' });
  }

  const conn = await pool.getConnection();

  try {
    console.log(`🔔 login-subscription-check 호출됨 - userId: ${userId}`);

    // 1. endpoint 존재 여부 확인
    const [existing] = await conn.query(
      `SELECT UserId FROM PushSubscriptions WHERE Endpoint = ? LIMIT 1`,
      [subscription.endpoint]
    );

    let tutorialId;
    if (existing.length > 0) {
      tutorialId = existing[0].UserId;
      console.log(`✅ 기존 subscription 감지됨 → tutorialId: ${tutorialId}`);
    } else {
      // 2. 새 tutorialN 생성
      const [rows] = await conn.query(`
        SELECT UserId FROM PushSubscriptions WHERE UserId LIKE 'tutorial%'
      `);
      let max = 0;
      for (const row of rows) {
        const match = row.UserId.match(/^tutorial(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num)) max = Math.max(max, num);
        }
      }
      tutorialId = `tutorial${max + 1}`;
      console.log(`🆕 새 tutorialId 생성됨: ${tutorialId}`);

      // 3. PushSubscriptions 저장
      await conn.query(`
        INSERT INTO PushSubscriptions (UserId, Endpoint, AuthKey, P256dhKey)
        VALUES (?, ?, ?, ?)
      `, [
        tutorialId,
        subscription.endpoint,
        subscription.keys.auth,
        subscription.keys.p256dh
      ]);
      console.log(`📦 PushSubscriptions 테이블에 새 구독 저장 완료`);
    }

    // 4. UserInfo에 tutorialId append
    const [[user]] = await conn.query(`SELECT TutorialIds FROM UserInfo WHERE UserId = ?`, [userId]);

    if (user) {
      const ids = user.TutorialIds ? user.TutorialIds.split(',') : [];
      if (!ids.includes(tutorialId)) {
        ids.push(tutorialId);
        await conn.query(`UPDATE UserInfo SET TutorialIds = ? WHERE UserId = ?`, [
          ids.join(','),
          userId
        ]);
        console.log(`📌 UserInfo.TutorialIds 갱신: ${ids.join(',')}`);
      } else {
        console.log(`🔁 tutorialId (${tutorialId}) 이미 포함되어 있음 → 갱신 생략`);
      }
    } else {
      console.warn(`⚠️ UserInfo에 해당 유저(${userId}) 없음`);
    }

    res.status(200).json({ success: true, tutorialId });
  } catch (err) {
    console.error("❌ login-subscription-check 처리 중 오류:", err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    conn.release();
  }
});


//IOS 꼼수. 나중에 이걸로 다 그냥 변경할지도.

app.post('/api/append-tutorial-id-fromios', async (req, res) => {
  const { userId, tutorialId } = req.body;

  if (!userId || !tutorialId) {
    return res.status(400).json({ status: 'error', message: 'userId와 tutorialId가 필요합니다.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT TutorialIds FROM UserInfo WHERE UserId = ?',
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const user = rows[0];

    let tutorialIds = [];
    if (user.TutorialIds) {
      try {
        tutorialIds = JSON.parse(user.TutorialIds);
        if (!Array.isArray(tutorialIds)) tutorialIds = [];
      } catch {
        tutorialIds = [];
      }
    }

    if (tutorialIds.includes(tutorialId)) {
      return res.json({ status: 'ok', message: '이미 등록된 tutorialId입니다.' });
    }

    tutorialIds.push(tutorialId);
    const updated = JSON.stringify(tutorialIds);

    await pool.query(
      'UPDATE UserInfo SET TutorialIds = ? WHERE UserId = ?',
      [updated, userId]
    );

    return res.json({ status: 'ok', message: 'tutorialId가 추가되었습니다.' });

  } catch (err) {
    console.error('❌ append-tutorial-id-fromios 오류:', err);
    return res.status(500).json({ status: 'error', message: '서버 오류 발생' });
  }
});




// 여기부터는 숙제 제출 PLUS 전체 스키마 싹 갈아엎음!

app.post('/api/saveHWPlus', upload.single('HWImage'), async function (req, res) {
  const {
    UserId, Subcategory, HWType, LessonNo, Comment
  } = req.body;

  const HWImage = req.file ? req.file.buffer : null;
  if (!HWImage) return res.status(400).json({ message: "No image uploaded" });

  const mimeType = req.file.mimetype;
  const originalName = req.file.originalname;
  const ext = originalName.split('.').pop(); // 확장자 추출
  const base = `${UserId}_${Subcategory}_${LessonNo}`;
  const safeBase = safeSupabaseKey(base);

  let fileName = `${safeBase}.${ext}`;
  let suffix = 1;

  while (true) {
    const { data: existing } = await supabase
      .storage
      .from('hw-images')
      .list('', { search: fileName });

    if (!existing || existing.length === 0) break;
    fileName = `${safeBase}(${suffix}).${ext}`;
    suffix++;
  }

  try {
    const { data, error } = await supabase.storage
      .from('hw-images')
      .upload(fileName, HWImage, {
        contentType: mimeType,
        upsert: false
      });

    if (error) throw error;

    const imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/hw-images/${fileName}`;

    const conn = await pool.getConnection();
    const insertQuery = `
      INSERT INTO HWImagesPlus 
      (UserId, Subcategory, HWType, LessonNo, orderedFileURL, Comment, Timestamp)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    await conn.query(insertQuery, [
      UserId, Subcategory, HWType, LessonNo, imageUrl, Comment || null
    ]);
    conn.release();

    res.status(200).json({ message: 'HW Plus saved', url: imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});


app.get('/api/getHWPlus', async function (req, res) {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const conn = await pool.getConnection();
    const query = `
      SELECT 
        HWIPId, UserId, Subcategory, HWType, LessonNo, Status, Score, 
        orderedFileURL, servedFileURL, Timestamp, Comment, FeedbackComment
      FROM HWImagesPlus
      WHERE UserId = ?
      ORDER BY Timestamp DESC
    `;
    const records = await conn.query(query, [userId]);
    conn.release();

    if (records.length === 0) {
      res.status(404).json({ message: 'No records found for this user' });
    } else {
      res.status(200).json(records);
    }
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch records', error: error.message });
  }
});

// diligence 올리고 구하는 api

app.post('/api/logDiligence', async (req, res) => {
  const { UserId, Subcategory, LessonNo, RegisteredBy, CreatedAt } = req.body;
  if (!UserId || !Subcategory) {
    return res.status(400).json({ message: 'UserId와 Subcategory는 필수입니다.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    const [user] = await conn.query(
      "SELECT Deadline FROM UserInfo WHERE UserId = ? LIMIT 1",
      [UserId]
    );
    const deadlineStr = user?.Deadline || '20:00:00';

    // ✅ 받은 CreatedAt이 있으면 그것 사용, 없으면 현재 KST 기준
    const createdDate = CreatedAt ? new Date(CreatedAt) : new Date(Date.now() + 9 * 60 * 60 * 1000);
    const dateStr = createdDate.toISOString().slice(0, 10);
    const deadlineFull = new Date(`${dateStr}T${deadlineStr}`);

    const lateMinutes = Math.max(0, Math.round((createdDate - deadlineFull) / (1000 * 60)));

    await conn.query(`
      INSERT INTO DiligenceLog
      (UserId, Subcategory, LessonNo, CreatedAt, Deadline, LateMinutes, RegisteredBy)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      UserId,
      Subcategory,
      LessonNo ?? 0,
      createdDate,
      deadlineFull,
      lateMinutes,
      RegisteredBy || 'system'
    ]);

    res.status(200).json({ success: true, lateMinutes });
  } catch (err) {
    console.error('❌ logDiligence 실패:', err);
    res.status(500).json({ message: '서버 오류', error: err.message });
  } finally {
    if (conn) conn.release();
  }
});


app.get('/api/getDiligenceStats', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ message: "userId 누락" });

  let conn;
  try {
    conn = await pool.getConnection();

    // ✅ 쿼리 결과를 rows로 직접 받음 (대괄호 제거!)
    const all = await conn.query(`
      SELECT Subcategory, LateMinutes, DATE_FORMAT(CreatedAt, '%Y-%m-%d') AS Day
      FROM DiligenceLog
      WHERE UserId = ?
    `, [userId]);

    if (!Array.isArray(all) || all.length === 0) {
      return res.status(200).json({
        totalSubmissions: 0,
        lateCount: 0,
        lateRate: 0,
        averageLateMinutes: 0,
        mostFrequentSubject: null,
        recent7Days: []
      });
    }

    const totalSubmissions = all.length;
    const lateList = all.filter(item => item.LateMinutes > 0);
    const lateCount = lateList.length;
    const averageLateMinutes = Math.round(
      lateList.reduce((sum, item) => sum + item.LateMinutes, 0) / (lateCount || 1)
    );
    const lateRate = +(lateCount / totalSubmissions * 100).toFixed(1);

    // 📚 가장 자주 한 과목
    const freqMap = {};
    all.forEach(item => {
      freqMap[item.Subcategory] = (freqMap[item.Subcategory] || 0) + 1;
    });
    const mostFrequentSubject = Object.entries(freqMap)
      .sort((a, b) => b[1] - a[1])[0][0];

    // 📆 최근 7일
    const today = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(today.getTime() + kstOffset);

    const dateList = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(kstNow);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dateList.push(key);
    }

    const dayMap = {};
    all.forEach(item => {
      if (!dayMap[item.Day]) {
        dayMap[item.Day] = { count: 0, late: 0 };
      }
      dayMap[item.Day].count++;
      if (item.LateMinutes > 0) dayMap[item.Day].late++;
    });

    const recent7Days = dateList.map(date => ({
      date,
      count: dayMap[date]?.count || 0,
      late: dayMap[date]?.late || 0
    }));

    res.status(200).json({
      totalSubmissions,
      lateCount,
      lateRate,
      averageLateMinutes,
      mostFrequentSubject,
      recent7Days
    });

  } catch (err) {
    console.error("❌ getDiligenceStats 실패:", err);
    res.status(500).json({ message: "서버 오류", error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

//여기부터는 progressmatrix 관련

app.post('/api/updateProgressMatrix', async (req, res) => {
  const { UserId, Subject, LessonNo, Status, RegisteredBy = 'system' } = req.body;

  if (!UserId || !Subject || !LessonNo || !Status) {
    return res.status(400).json({ message: "필수 필드가 누락되었습니다." });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    const existing = await conn.query(
      `SELECT * FROM ProgressMatrix WHERE UserId = ? AND Subject = ? AND LessonNo = ?`,
      [UserId, Subject, LessonNo]
    );

    if (existing.length > 0) {
      await conn.query(
        `UPDATE ProgressMatrix 
         SET Status = ?, RegisteredBy = ?, UpdatedAt = CURRENT_TIMESTAMP 
         WHERE UserId = ? AND Subject = ? AND LessonNo = ?`,
        [Status, RegisteredBy, UserId, Subject, LessonNo]
      );
    } else {
      await conn.query(
        `INSERT INTO ProgressMatrix (UserId, Subject, LessonNo, Status, RegisteredBy) 
         VALUES (?, ?, ?, ?, ?)`,
        [UserId, Subject, LessonNo, Status, RegisteredBy]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ updateProgressMatrix 오류:', error);
    res.status(500).json({ message: '서버 오류', error: error.message });
  } finally {
    if (conn) conn.release();
  }
});



app.get('/api/getProgressMatrixAll', async (req, res) => {
  const { UserId } = req.query;

  if (!UserId) {
    return res.status(400).json({ message: "UserId는 필수입니다." });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT Subject, LessonNo, Status FROM ProgressMatrix WHERE UserId = ?`,
      [UserId]
    );
    conn.release();

    const grouped = {};
    for (const row of rows) {
      const { Subject, LessonNo, Status } = row;
      if (!grouped[Subject]) grouped[Subject] = [];
      grouped[Subject].push({ LessonNo, Status });
    }

    res.json(grouped);
  } catch (error) {
    console.error('❌ getProgressMatrixAll 오류:', error);
    res.status(500).json({ message: '서버 오류', error: error.message });
  }
});



// 여기부터는 이제 cron 하고 푸시알림 타이머 좀 하는 로직.

const cron = require('node-cron');
const axios = require('axios'); // ✅ fetch 대신 axios 사용

// ⏰ 1분마다 실행
cron.schedule('* * * * *', async () => {
  console.log("⏰ [CRON] 정확히 30분 전 푸시 체크 시작");

  let conn;
  try {
    // ✅ STEP 1: 미제출 학생 목록 가져오기
    const response = await axios.get('http://localhost:3000/api/unsubmitted-today');
    const { unsubmitted } = response.data;

    const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // ✅ KST 기준

    conn = await pool.getConnection();

    for (const student of unsubmitted) {
      // ✅ STEP 2: 마감 시간 파싱 (HH:mm:ss)
      const [h, m] = student.deadline.split(':').slice(0, 2).map(Number);

      const deadline = new Date(now); // ✅ 오늘 날짜 기반 마감시간
      deadline.setHours(h, m, 0, 0);

      const diffMin = Math.floor((deadline - now) / 1000 / 60);

      // 🔍 디버깅 로그
      console.log(`🕓 now: ${now.toISOString()}`);
      console.log(`⏰ deadline(${student.userId}): ${deadline.toISOString()}`);
      console.log(`➡️ diffMin: ${diffMin}`);

      if (diffMin === 30) {
        console.log(`📣 [PUSH] ${student.userId} → 마감 30분 전 알림 전송 시도`);

        // ✅ STEP 3: TutorialIds 조회
        const [userRow] = await conn.query(
          `SELECT TutorialIds FROM UserInfo WHERE UserId = ?`,
          [student.userId]
        );

        if (!userRow || !userRow.TutorialIds) {
          console.log(`⚠️ ${student.userId} → TutorialIds 없음`);
          continue;
        }

        const tutorialIds = userRow.TutorialIds.split(',');

        // ✅ STEP 4: TutorialIds 전부에 푸시 전송
        for (const tid of tutorialIds) {
          const pushRes = await conn.query(
            `SELECT Endpoint AS endpoint, P256dhKey AS p256dh, AuthKey AS auth 
             FROM PushSubscriptions WHERE userId = ?`,
            [tid]
          );

          if (pushRes.length === 0) {
            console.log(`⚠️ ${student.userId} → ${tid}에 등록된 푸시 없음`);
            continue;
          }

          const { endpoint, p256dh, auth } = pushRes[0];
          const payload = JSON.stringify({
            title: '⏰ 숙제 제출 마감 임박!',
            body: `${student.userId}님, 숙제 제출 마감이 30분 남았어요!`
          });

          try {
            await webpush.sendNotification(
              {
                endpoint,
                keys: { p256dh, auth }
              },
              payload
            );
            console.log(`✅ [PUSH SENT] ${student.userId} → ${tid}`);
          } catch (err) {
            console.error(`❌ [PUSH ERROR] ${student.userId} / ${tid}:`, err);
          }
        }

      } else {
        console.log(`⏳ [SKIP] ${student.userId} → 마감까지 ${diffMin}분 남음`);
      }
    }

  } catch (err) {
    console.error("❌ [CRON ERROR]:", err);
  } finally {
    if (conn) conn.release();
  }
});






app.get('/api/unsubmitted-today', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log("📥 [STEP 1] UserInfo 테이블 조회 시작...");

    const users = await conn.query(`
      SELECT UserId, Deadline 
      FROM UserInfo 
      WHERE UserType = 'student' AND IsRegistered = 1
    `);

    console.log(`📋 [STEP 2] 조건에 맞는 유저 수: ${users.length}`);

    const unsubmitted = [];

    for (const user of users) {
      console.log(`\n🔍 [STEP 3] UserId: ${user.UserId} → 숙제 제출 여부 확인 중...`);

      const raw = await conn.query(`
        SELECT COUNT(*) AS count 
        FROM HWImagesPlus 
        WHERE UserId = ? 
        AND DATE(Timestamp) = CURDATE()
      `, [user.UserId]);

      const count = parseInt(raw[0]?.count ?? 0);  // ✅ 문자열 "0" 대비
      console.log(`📦 숙제 제출 수: ${count}`);

      if (count === 0) {
        console.log(`⛔ [미제출] ${user.UserId} → 리스트에 추가`);
        unsubmitted.push({
          userId: user.UserId,
          deadline: user.Deadline
        });
      } else {
        console.log(`✅ [제출함] ${user.UserId}`);
      }
    }

    console.log("\n📤 [STEP 4] 미제출자 최종 리스트:", unsubmitted);
    res.status(200).json({ unsubmitted });

  } catch (err) {
    console.error("❌ 서버 오류:", err);
    res.status(500).json({ message: "서버 오류", error: err.message });
  } finally {
    if (conn) conn.release();
  }
});









// 서버 시작
app.listen(3000, function () {
    console.log('Server listening on port 3000');
});
