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
app.use(cors());


function jsonSafe(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = jsonSafe(v);
    return out;
  }
  return value;
}

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


const upload = multer(); // Multer ?ㅼ젙

// 寃곌낵 ???API
app.post('/api/saveResults', async function (req, res) {
    console.log("Received POST /api/saveResults");
    const { userId, results } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction(); // ?몃옖??뀡 ?쒖옉

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

            // 寃곌낵 ???
            const insertQuery = "INSERT INTO Results (UserId, SubcategoryId, QuizNo, UserResponse, CorrectAnswer, Correctness, Timestamp, TestCount, TestRange) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            const insertValues = [userId, subcategory.SubcategoryId, result.quizNo, result.userResponse, result.correctAnswer, result.correctness, result.timestamp, result.testCount, result.testRange];
            await conn.query(insertQuery, insertValues);
        }

        await conn.commit(); // 紐⑤뱺 荑쇰━媛 ?깃났?곸쑝濡??ㅽ뻾?섎㈃ 而ㅻ컠
        res.status(200).json({ message: 'Results saved successfully' });
    } catch (error) {
        console.error('Database error:', error);
        if (conn) {
            await conn.rollback(); // ?먮윭 諛쒖깮 ??濡ㅻ갚
        }
        res.status(500).json({ message: 'Failed to save results', error: error.message });
    } finally {
        if (conn) {
            conn.release(); // 留덉?留됱뿉 ??긽 ?곌껐 ?댁젣
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
            // SubcategoryName???ъ슜?섏뿬 SubcategoryId 議고쉶
            const subcategoryQuery = "SELECT SubcategoryId FROM Subcategories WHERE SubcategoryName = ?";
            const [subcategory] = await conn.query(subcategoryQuery, [grade.subcategoryName]);
            
            if (!subcategory) {
                throw new Error(`Subcategory not found for name: ${grade.subcategoryName}`);
            }

            const subcategoryId = subcategory.SubcategoryId;

            // Grades ?뚯씠釉붿뿉 ?곗씠?????
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
            await conn.rollback();  // 濡ㅻ갚??泥섎━
        }
        res.status(500).json({ message: 'Failed to save grades', error: error.message });
    } finally {
        if (conn) {
            conn.release();  // ?곌껐 ?댁젣瑜??뺤떎?섍쾶 泥섎━
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

  // ??以묐났???뚯씪紐?諛⑹? 猷⑦봽
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
        upsert: false  // ????뼱?곌린 諛⑹?
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




  
  



// CustomWordsList ???API
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

// HWImages 議고쉶 API
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

  

// CustomWordsList 議고쉶 API
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

// ?뱀젙 ?ъ슜?먯쓽 寃곌낵 議고쉶 API
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

// 紐⑤뱺 寃곌낵 議고쉶 API
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

// ?뱀젙 ?ъ슜?먯쓽 寃곌낵 珥덇린??API
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

// 紐⑤뱺 寃곌낵 珥덇린??API
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

    // ?뵇 ?붾쾭源낆슜 濡쒓렇 異붽?
    console.log('荑쇰━ 寃곌낵:', result);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: 'No subscription found for this userId' });
    }

    const row = result[0]; // ??泥??됰쭔 異붿텧

    const sub = {
      endpoint: row.Endpoint,
      keys: {
        auth: row.AuthKey,
        p256dh: row.P256dhKey
      }
    };

    const payload = JSON.stringify({ title, body });

    await webpush.sendNotification(sub, payload);

    console.log(`??${userId}?먭쾶 ?몄떆 ?꾩넚 ?꾨즺`);
    res.status(200).json({ message: 'Push sent' });

  } catch (err) {
    console.error('???몄떆 ?꾩넚 ?ㅽ뙣:', err);
    res.status(500).json({ message: 'Push error', error: err.message });
  }
});

// Tutorial Id 理쒖떊 諛쏆븘?ㅺ퀬 +1?댁꽌 遺??
app.post('/api/grant-tutorial-id', async (req, res) => {
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ message: 'Invalid subscription object' });
  }

  try {
    const conn = await pool.getConnection();

    // 1. ?대? ?숈씪 endpoint媛 議댁옱?섎뒗吏 ?뺤씤
    const [existing] = await conn.query(
      `SELECT UserId FROM PushSubscriptions WHERE Endpoint = ? LIMIT 1`,
      [subscription.endpoint]
    );

    if (existing && existing.UserId) {
      conn.release();
      return res.status(200).json({ userId: existing.UserId });
    }

    // 2. tutorial% ID 以?媛???믪? ?レ옄 李얘린
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

    // 3. ??subscription ???
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

// <------- ?ш린遺?곕뒗 ?뚯썝媛?낃낵 濡쒓렇???깅벑??

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

  // ???꾩닔 ??ぉ 寃利?
  if (
    !userId ||
    !password ||
    !Array.isArray(tutorialIds) ||
    !userType ||
    !name ||
    !birthYear ||
    !connectedTo // ??蹂댄샇??or ?먮? ID ?꾩슂
  ) {
    return res.status(400).json({ message: '?꾨씫???꾩닔 ?뺣낫媛 ?덉뒿?덈떎.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    // ??以묐났 ID 寃??
    const [existing] = await conn.query("SELECT UserId FROM UserInfo WHERE UserId = ?", [userId]);
    if (existing) {
      conn.release();
      return res.status(409).json({ message: '?대? 議댁옱?섎뒗 ID?낅땲??' });
    }

    // ??INSERT 荑쇰━
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
    console.error('???뚯썝媛???ㅽ뙣:', error);
    if (conn) conn.release();
    res.status(500).json({ message: '?쒕쾭 ?ㅻ쪟', error: error.message });
  }
});





app.post('/api/login', async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ message: 'userId? password瑜??낅젰?섏꽭??' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const query = `
      SELECT UserId, UserType, IsRegistered
      FROM UserInfo
      WHERE UserId = ? AND Password = ?
      LIMIT 1
    `;
    const result = await conn.query(query, [userId, password]);

    if (result.length > 0) {
      res.status(200).json({
        userId: result[0].UserId,
        userType: result[0].UserType,
        isRegistered: result[0].IsRegistered === 1
      });
    } else {
      res.status(401).json({ message: 'ID ?먮뒗 鍮꾨?踰덊샇媛 ?쇱튂?섏? ?딆뒿?덈떎.' });
    }
  } catch (err) {
    console.error('??濡쒓렇???ㅻ쪟:', err);
    res.status(500).json({ message: '?쒕쾭 ?ㅻ쪟', error: err.message });
  } finally {
    if (conn) conn.release();
  }
});


app.get('/api/whosmychild', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ message: "userId ?꾨씫" });

  try {
    const conn = await pool.getConnection();
    const query = `SELECT ConnectedTo FROM UserInfo WHERE UserId = ? LIMIT 1`;
    const [result] = await conn.query(query, [userId]);
    conn.release();

    if (!result || !result.ConnectedTo) {
      return res.status(404).json({ message: "?곌껐???먮? ?뺣낫 ?놁쓬" });
    }

    res.status(200).json({ childId: result.ConnectedTo });
  } catch (err) {
    console.error("??whosmychild ?ㅻ쪟:", err);
    res.status(500).json({ message: "?쒕쾭 ?ㅻ쪟", error: err.message });
  }
});




app.post('/api/login-subscription-check', async (req, res) => {
  const { userId, subscription } = req.body;

  if (!userId || !subscription || !subscription.endpoint) {
    console.warn("???섎せ???붿껌: userId ?먮뒗 subscription ?꾨씫");
    return res.status(400).json({ message: 'Invalid input' });
  }

  const conn = await pool.getConnection();

  try {
    console.log(`?뵒 login-subscription-check ?몄텧??- userId: ${userId}`);

    // 1. endpoint 議댁옱 ?щ? ?뺤씤
    const [existing] = await conn.query(
      `SELECT UserId FROM PushSubscriptions WHERE Endpoint = ? LIMIT 1`,
      [subscription.endpoint]
    );

    let tutorialId;
    if (existing.length > 0) {
      tutorialId = existing[0].UserId;
      console.log(`??湲곗〈 subscription 媛먯?????tutorialId: ${tutorialId}`);
    } else {
      // 2. ??tutorialN ?앹꽦
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
      console.log(`?넅 ??tutorialId ?앹꽦?? ${tutorialId}`);

      // 3. PushSubscriptions ???
      await conn.query(`
        INSERT INTO PushSubscriptions (UserId, Endpoint, AuthKey, P256dhKey)
        VALUES (?, ?, ?, ?)
      `, [
        tutorialId,
        subscription.endpoint,
        subscription.keys.auth,
        subscription.keys.p256dh
      ]);
      console.log(`?벀 PushSubscriptions ?뚯씠釉붿뿉 ??援щ룆 ????꾨즺`);
    }

    // 4. UserInfo??tutorialId append
    const [[user]] = await conn.query(`SELECT TutorialIds FROM UserInfo WHERE UserId = ?`, [userId]);

    if (user) {
      const ids = user.TutorialIds ? user.TutorialIds.split(',') : [];
      if (!ids.includes(tutorialId)) {
        ids.push(tutorialId);
        await conn.query(`UPDATE UserInfo SET TutorialIds = ? WHERE UserId = ?`, [
          ids.join(','),
          userId
        ]);
        console.log(`?뱦 UserInfo.TutorialIds 媛깆떊: ${ids.join(',')}`);
      } else {
        console.log(`?봺 tutorialId (${tutorialId}) ?대? ?ы븿?섏뼱 ?덉쓬 ??媛깆떊 ?앸왂`);
      }
    } else {
      console.warn(`?좑툘 UserInfo???대떦 ?좎?(${userId}) ?놁쓬`);
    }

    res.status(200).json({ success: true, tutorialId });
  } catch (err) {
    console.error("??login-subscription-check 泥섎━ 以??ㅻ쪟:", err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    conn.release();
  }
});


//IOS 瑗쇱닔. ?섏쨷???닿구濡???洹몃깷 蹂寃쏀븷吏??

app.post('/api/append-tutorial-id-fromios', async (req, res) => {
  const { userId, tutorialId } = req.body;

  console.log("?뱿 raw req.body:", req.body);
  console.log("?뱿 userId =", userId, "| tutorialId =", tutorialId);

  if (!userId || !tutorialId) {
    return res.status(400).json({ status: 'error', message: 'userId? tutorialId媛 ?꾩슂?⑸땲??' });
  }

  try {
    const rows = await pool.query(
      'SELECT TutorialIds FROM UserInfo WHERE UserId = ?',
      [userId]
    );

    console.log("?뵇 SELECT rows:", rows);

    if (!rows || rows.length === 0) {
      console.warn(`??DB???대떦 userId ?놁쓬: "${userId}"`);
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const user = rows[0];  // ??rows??諛곗뿴, 泥?踰덉㎏ ??爰쇰깂
    console.log("??user = ", user);

    let tutorialIds = user.TutorialIds ? user.TutorialIds.split(',') : [];

    if (tutorialIds.includes(tutorialId)) {
      console.log(`?봺 ?대? ?ы븿??tutorialId: ${tutorialId}`);
      return res.json({ status: 'ok', message: '?대? ?깅줉??tutorialId?낅땲??' });
    }

    tutorialIds.push(tutorialId);
    const updated = tutorialIds.join(',');

    await pool.query(
      'UPDATE UserInfo SET TutorialIds = ? WHERE UserId = ?',
      [updated, userId]
    );

    console.log(`tutorialId '${tutorialId}' added to '${userId}'`);
    return res.json({ status: 'ok', message: 'tutorialId媛 異붽??섏뿀?듬땲??' });

  } catch (err) {
    console.error('??append-tutorial-id-fromios ?ㅻ쪟:', err);
    return res.status(500).json({ status: 'error', message: '?쒕쾭 ?ㅻ쪟 諛쒖깮' });
  }
});
















// ?ш린遺?곕뒗 ?숈젣 ?쒖텧 PLUS ?꾩껜 ?ㅽ궎留???媛덉븘?롮쓬!

app.post('/api/saveHWPlus', upload.single('HWImage'), async function (req, res) {
  const {
    UserId, Subcategory, HWType, LessonNo, Comment
  } = req.body;

  const HWImage = req.file ? req.file.buffer : null;
  if (!HWImage) return res.status(400).json({ message: "No image uploaded" });

  const mimeType = req.file.mimetype;
  const originalName = req.file.originalname;
  const ext = originalName.split('.').pop(); // ?뺤옣??異붿텧
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

// diligence ?щ━怨?援ы븯??api

app.post('/api/logDiligence', async (req, res) => {
  const { UserId, Subcategory, LessonNo, RegisteredBy, CreatedAt } = req.body;
  if (!UserId || !Subcategory) {
    return res.status(400).json({ message: 'UserId? Subcategory???꾩닔?낅땲??' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    const [user] = await conn.query(
      "SELECT Deadline FROM UserInfo WHERE UserId = ? LIMIT 1",
      [UserId]
    );
    const deadlineStr = user?.Deadline || '20:00:00';

    // ??諛쏆? CreatedAt???덉쑝硫?洹멸쾬 ?ъ슜, ?놁쑝硫??꾩옱 KST 湲곗?
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
    console.error('??logDiligence ?ㅽ뙣:', err);
    res.status(500).json({ message: '?쒕쾭 ?ㅻ쪟', error: err.message });
  } finally {
    if (conn) conn.release();
  }
});


app.get('/api/getDiligenceStats', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ message: "userId ?꾨씫" });

  let conn;
  try {
    conn = await pool.getConnection();

    // ??荑쇰━ 寃곌낵瑜?rows濡?吏곸젒 諛쏆쓬 (?愿꾪샇 ?쒓굅!)
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

    // ?뱴 媛???먯＜ ??怨쇰ぉ
    const freqMap = {};
    all.forEach(item => {
      freqMap[item.Subcategory] = (freqMap[item.Subcategory] || 0) + 1;
    });
    const mostFrequentSubject = Object.entries(freqMap)
      .sort((a, b) => b[1] - a[1])[0][0];

    // ?뱠 理쒓렐 7??
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
    console.error("??getDiligenceStats ?ㅽ뙣:", err);
    res.status(500).json({ message: "?쒕쾭 ?ㅻ쪟", error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

//?ш린遺?곕뒗 progressmatrix 愿??

app.post('/api/updateProgressMatrix', async (req, res) => {
  const {
    UserId,
    Subject,
    LessonNo,
    Status,
    RegisteredBy = 'system'
  } = req.body;

  if (!UserId || !Subject || !LessonNo || !Status) {
    return res.status(400).json({ message: "?꾩닔 ?꾨뱶媛 ?꾨씫?섏뿀?듬땲??" });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    // ??湲곗〈 ?곗씠??濡쒕뱶 (for 鍮꾧탳 諛?遺꾩꽍)
    const [rows] = await conn.query(
      `SELECT LessonNo, Status, UpdatedAt FROM ProgressMatrix WHERE UserId = ? AND Subject = ?`,
      [UserId, Subject]
    );

    if (!rows) {
      console.warn(`??DB 議고쉶 ?ㅽ뙣: "${UserId}" / "${Subject}"`);
      return res.status(500).json({ message: 'DB 議고쉶 ?ㅽ뙣' });
    }

    console.log(`?뵇 ?꾩옱 DB ?곹깭 (${UserId} / ${Subject}):`, rows);

    const rawLessonNo = LessonNo;  // ????ν븷 ?ㅼ젣 LessonNo 臾몄옄??
    const parsedLessons = [];      // ??遺꾩꽍??遺꾪빐 由ъ뒪??

    if (typeof rawLessonNo === 'string' && rawLessonNo.includes('~')) {
      const [startStr, endStr] = rawLessonNo.split('~').map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end) || start > end) {
        return res.status(400).json({ message: '?섎せ??踰붿쐞 ?뺤떇?낅땲?? (?? "1~30")' });
      }

      for (let i = start; i <= end; i++) {
        parsedLessons.push(i.toString());
      }
    } else {
      parsedLessons.push(rawLessonNo.toString());
    }

    console.log(`?벀 ?뚯떛??Lesson 紐⑸줉 (遺꾩꽍??:`, parsedLessons);

    // ??LessonNo 臾몄옄??洹몃?濡?議댁옱?섎뒗吏 ?뺤씤
    const [existRows] = await conn.query(
      `SELECT * FROM ProgressMatrix WHERE UserId = ? AND Subject = ? AND LessonNo = ?`,
      [UserId, Subject, rawLessonNo]
    );

    const exists = existRows?.length > 0;

    if (exists) {
      console.log(`?삼툘 UPDATE: ${rawLessonNo}`);
      await conn.query(
        `UPDATE ProgressMatrix 
         SET Status = ?, RegisteredBy = ?, UpdatedAt = NOW() 
         WHERE UserId = ? AND Subject = ? AND LessonNo = ?`,
        [Status, RegisteredBy, UserId, Subject, rawLessonNo]
      );
    } else {
      console.log(`??INSERT: ${rawLessonNo}`);
      await conn.query(
        `INSERT INTO ProgressMatrix 
         (UserId, Subject, LessonNo, Status, RegisteredBy, UpdatedAt) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [UserId, Subject, rawLessonNo, Status, RegisteredBy]
      );
    }

    res.json({ success: true, lessonsAffected: parsedLessons });
  } catch (error) {
    console.error('??updateProgressMatrix ?ㅻ쪟:', error);
    res.status(500).json({ message: '?쒕쾭 ?ㅻ쪟', error: error.message });
  } finally {
    if (conn) conn.release();
  }
});






app.get('/api/getProgressMatrixAll', async (req, res) => {
  const { UserId } = req.query;

  if (!UserId) {
    return res.status(400).json({ message: "UserId???꾩닔?낅땲??" });
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
    console.error('??getProgressMatrixAll ?ㅻ쪟:', error);
    res.status(500).json({ message: '?쒕쾭 ?ㅻ쪟', error: error.message });
  }
});



// ?ш린遺?곕뒗 ?댁젣 cron ?섍퀬 ?몄떆?뚮┝ ??대㉧ 醫 ?섎뒗 濡쒖쭅.

const cron = require('node-cron');
const axios = require('axios'); // ??fetch ???axios ?ъ슜

// ??1遺꾨쭏???ㅽ뻾
cron.schedule('* * * * *', async () => {
  console.log("??[CRON] ?뺥솗??30遺????몄떆 泥댄겕 ?쒖옉");

  let conn;
  try {
    // ??STEP 1: 誘몄젣異??숈깮 紐⑸줉 媛?몄삤湲?
    const response = await axios.get('http://localhost:3000/api/unsubmitted-today');
    const { unsubmitted } = response.data;

    const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // ??KST 湲곗?

    conn = await pool.getConnection();

    for (const student of unsubmitted) {
      // ??STEP 2: 留덇컧 ?쒓컙 ?뚯떛 (HH:mm:ss)
      const [h, m] = student.deadline.split(':').slice(0, 2).map(Number);

      const deadline = new Date(now); // ???ㅻ뒛 ?좎쭨 湲곕컲 留덇컧?쒓컙
      deadline.setHours(h, m, 0, 0);

      const diffMin = Math.floor((deadline - now) / 1000 / 60);

      // ?뵇 ?붾쾭源?濡쒓렇
      console.log(`?븪 now: ${now.toISOString()}`);
      console.log(`??deadline(${student.userId}): ${deadline.toISOString()}`);
      console.log(`?∽툘 diffMin: ${diffMin}`);

      if (diffMin === 30) {
        console.log(`?뱽 [PUSH] ${student.userId} ??留덇컧 30遺????뚮┝ ?꾩넚 ?쒕룄`);

        // ??STEP 3: TutorialIds 議고쉶
        const [userRow] = await conn.query(
          `SELECT TutorialIds FROM UserInfo WHERE UserId = ?`,
          [student.userId]
        );

        if (!userRow || !userRow.TutorialIds) {
          console.log(`?좑툘 ${student.userId} ??TutorialIds ?놁쓬`);
          continue;
        }

        const tutorialIds = userRow.TutorialIds.split(',');

        // ??STEP 4: TutorialIds ?꾨????몄떆 ?꾩넚
        for (const tid of tutorialIds) {
          const pushRes = await conn.query(
            `SELECT Endpoint AS endpoint, P256dhKey AS p256dh, AuthKey AS auth 
             FROM PushSubscriptions WHERE userId = ?`,
            [tid]
          );

          if (pushRes.length === 0) {
            console.log(`?좑툘 ${student.userId} ??${tid}???깅줉???몄떆 ?놁쓬`);
            continue;
          }

          const { endpoint, p256dh, auth } = pushRes[0];
          const payload = JSON.stringify({
            title: '???숈젣 ?쒖텧 留덇컧 ?꾨컯!',
            body: `${student.userId}?? ?숈젣 ?쒖텧 留덇컧??30遺??⑥븯?댁슂!`
          });

          try {
            await webpush.sendNotification(
              {
                endpoint,
                keys: { p256dh, auth }
              },
              payload
            );
            console.log(`??[PUSH SENT] ${student.userId} ??${tid}`);
          } catch (err) {
            console.error(`??[PUSH ERROR] ${student.userId} / ${tid}:`, err);
          }
        }

      } else {
        console.log(`??[SKIP] ${student.userId} ??留덇컧源뚯? ${diffMin}遺??⑥쓬`);
      }
    }

  } catch (err) {
    console.error("??[CRON ERROR]:", err);
  } finally {
    if (conn) conn.release();
  }
});






app.get('/api/unsubmitted-today', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log("?뱿 [STEP 1] UserInfo ?뚯씠釉?議고쉶 ?쒖옉...");

    const users = await conn.query(`
      SELECT UserId, Deadline 
      FROM UserInfo 
      WHERE UserType = 'student' AND IsRegistered = 1
    `);

    console.log(`?뱥 [STEP 2] 議곌굔??留욌뒗 ?좎? ?? ${users.length}`);

    const unsubmitted = [];

    for (const user of users) {
      console.log(`\n?뵇 [STEP 3] UserId: ${user.UserId} ???숈젣 ?쒖텧 ?щ? ?뺤씤 以?..`);

      const raw = await conn.query(`
        SELECT COUNT(*) AS count 
        FROM HWImagesPlus 
        WHERE UserId = ? 
        AND DATE(Timestamp) = CURDATE()
      `, [user.UserId]);

      const count = parseInt(raw[0]?.count ?? 0);  // ??臾몄옄??"0" ?鍮?
      console.log(`?벀 ?숈젣 ?쒖텧 ?? ${count}`);

      if (count === 0) {
        console.log(`??[誘몄젣異? ${user.UserId} ??由ъ뒪?몄뿉 異붽?`);
        unsubmitted.push({
          userId: user.UserId,
          deadline: user.Deadline
        });
      } else {
        console.log(`??[?쒖텧?? ${user.UserId}`);
      }
    }

    console.log("\n?뱾 [STEP 4] 誘몄젣異쒖옄 理쒖쥌 由ъ뒪??", unsubmitted);
    res.status(200).json({ unsubmitted });

  } catch (err) {
    console.error("???쒕쾭 ?ㅻ쪟:", err);
    res.status(500).json({ message: "?쒕쾭 ?ㅻ쪟", error: err.message });
  } finally {
    if (conn) conn.release();
  }
});


//TeacherPanel 愿?⑦빐??

app.get('/api/getAllUserInfos', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT UserId, UserType, Name, BirthYear, ConnectedTo,
             PhoneNumber, Deadline, Coin, GuardianContact,
             CreatedAt, IsRegistered, TutorialIds
      FROM UserInfo
    `);
    res.json(rows);
  } catch (err) {
    console.error('??getAllUserInfos ?ㅻ쪟:', err);
    res.status(500).json({ message: '?쒕쾭 ?ㅻ쪟', error: String(err) });
  } finally {
    if (conn) conn.release();
  }
});

// LIVE -> AFTERCLASS
app.post('/api/LiveToAfterclass_send', async (req, res) => {
  const {
    UserId,
    LiveSchedule,
    SessionNo = 1,
    QLevel,
    QYear,
    QMonth,
    ServedFileURL,
    PayloadJson,
    Bucket
  } = req.body || {};

  const receivedKeys = Object.keys(req.body || {});
  const missing = [];
  if (!UserId) missing.push('UserId');
  if (!LiveSchedule) missing.push('LiveSchedule');
  if (!QLevel) missing.push('QLevel');
  if (QYear === undefined) missing.push('QYear');
  if (QMonth === undefined) missing.push('QMonth');
  if (!ServedFileURL && PayloadJson === undefined) missing.push('ServedFileURL|PayloadJson');

  if (missing.length > 0) {
    console.warn('[LiveToAfterclass_send] missing fields:', missing, 'received keys:', receivedKeys);
    return res.status(400).json({
      message: '?꾩닔 ?꾨뱶媛 ?꾨씫?섏뿀?듬땲??',
      missing,
      receivedKeys
    });
  }

  const parsedSessionNo = Number(SessionNo);
  const parsedQYear = Number(QYear);
  const parsedQMonth = Number(QMonth);

  if (
    Number.isNaN(parsedSessionNo) ||
    Number.isNaN(parsedQYear) ||
    Number.isNaN(parsedQMonth)
  ) {
    return res.status(400).json({ message: 'SessionNo, QYear, QMonth???レ옄?ъ빞 ?⑸땲??' });
  }

  const bucket = String(Bucket || 'hw-images');
  let finalServedFileURL = ServedFileURL ? String(ServedFileURL) : '';

  // If URL is not provided, upload JSON payload to Supabase first and use its public URL.
  if (!finalServedFileURL) {
    if (PayloadJson === undefined) {
      return res.status(400).json({ message: 'ServedFileURL ?먮뒗 PayloadJson 以??섎굹???꾩슂?⑸땲??' });
    }

    let jsonText = '';
    if (typeof PayloadJson === 'string') {
      try {
        // Normalize as valid JSON text if possible.
        jsonText = JSON.stringify(JSON.parse(PayloadJson), null, 2);
      } catch (_e) {
        jsonText = PayloadJson;
      }
    } else {
      jsonText = JSON.stringify(PayloadJson, null, 2);
    }

    const nowStamp = Date.now();
    const safeUser = safeSupabaseKey(String(UserId));
    const safeLevel = safeSupabaseKey(String(QLevel));
    const storagePath = `live-json/${safeUser}_${safeLevel}_${parsedQYear}_${parsedQMonth}_s${parsedSessionNo}_${nowStamp}.json`;

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(storagePath, Buffer.from(jsonText, 'utf-8'), {
        contentType: 'application/json; charset=utf-8',
        upsert: false
      });

    if (upErr) {
      return res.status(500).json({ message: 'Supabase ?낅줈???ㅽ뙣', error: String(upErr.message || upErr) });
    }

    finalServedFileURL = `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`;
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const insertQuery = `
      INSERT INTO LiveSessionAS
      (UserId, LiveSchedule, SessionNo, QLevel, QYear, QMonth, ServedFileURL)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await conn.query(insertQuery, [
      String(UserId),
      LiveSchedule,
      parsedSessionNo,
      String(QLevel),
      parsedQYear,
      parsedQMonth,
      String(finalServedFileURL)
    ]);
    const safeInsertId =
      result && result.insertId !== undefined && result.insertId !== null
        ? String(result.insertId)
        : null;

    res.status(200).json({
      success: true,
      LSASId: safeInsertId,
      ServedFileURL: finalServedFileURL
    });
  } catch (err) {
    console.error('LiveToAfterclass_send ?ㅻ쪟:', err);
    res.status(500).json({ message: '????ㅽ뙣', error: String(err?.message || err) });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/LiveToAfterclass_receive', async (req, res) => {
  const userId = req.query.userId || req.query.UserId;
  const liveSchedule = req.query.liveSchedule || req.query.LiveSchedule; // yyyy-mm-dd or datetime
  const sessionNoRaw = req.query.sessionNo || req.query.SessionNo;
  const qLevel = req.query.qLevel || req.query.QLevel;
  const qYearRaw = req.query.qYear || req.query.QYear;
  const qMonthRaw = req.query.qMonth || req.query.QMonth;
  const limitRaw = req.query.limit;

  if (!userId) {
    return res.status(400).json({ message: 'userId(UserId)媛 ?꾩슂?⑸땲??' });
  }

  const params = [String(userId)];
  let query = `
    SELECT
      LSASId, UserId, LiveSchedule, SessionNo, QLevel, QYear, QMonth, ServedFileURL, UpdatedAt
    FROM LiveSessionAS
    WHERE UserId = ?
  `;

  if (liveSchedule) {
    query += ` AND DATE(LiveSchedule) = DATE(?)`;
    params.push(liveSchedule);
  }

  if (sessionNoRaw !== undefined) {
    const n = Number(sessionNoRaw);
    if (Number.isNaN(n)) {
      return res.status(400).json({ message: 'sessionNo(SessionNo)???レ옄?ъ빞 ?⑸땲??' });
    }
    query += ` AND SessionNo = ?`;
    params.push(n);
  }

  if (qLevel) {
    query += ` AND QLevel = ?`;
    params.push(String(qLevel));
  }

  if (qYearRaw !== undefined) {
    const n = Number(qYearRaw);
    if (Number.isNaN(n)) {
      return res.status(400).json({ message: 'qYear(QYear)???レ옄?ъ빞 ?⑸땲??' });
    }
    query += ` AND QYear = ?`;
    params.push(n);
  }

  if (qMonthRaw !== undefined) {
    const n = Number(qMonthRaw);
    if (Number.isNaN(n)) {
      return res.status(400).json({ message: 'qMonth(QMonth)???レ옄?ъ빞 ?⑸땲??' });
    }
    query += ` AND QMonth = ?`;
    params.push(n);
  }

  let limit = 50;
  if (limitRaw !== undefined) {
    const n = Number(limitRaw);
    if (Number.isNaN(n)) {
      return res.status(400).json({ message: 'limit? ?レ옄?ъ빞 ?⑸땲??' });
    }
    limit = Math.min(Math.max(n, 1), 500);
  }

  query += ` ORDER BY UpdatedAt DESC, LSASId DESC LIMIT ?`;
  params.push(limit);

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(query, params);
    res.status(200).json(jsonSafe(rows));
  } catch (err) {
    console.error('LiveToAfterclass_receive ?ㅻ쪟:', err);
    res.status(500).json({ message: '議고쉶 ?ㅽ뙣', error: String(err?.message || err) });
  } finally {
    if (conn) conn.release();
  }
});








// ?쒕쾭 ?쒖옉
app.listen(3000, function () {
    console.log('Server listening on port 3000');
});


