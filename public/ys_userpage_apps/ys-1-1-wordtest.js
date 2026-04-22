(function () {
  var registry = window.YSUserApps = window.YSUserApps || {};

  var RAW_WORDS = `3과-Gateway	modularised	모듈화된, 잘게 쪼개진
3과-Gateway	standardised	표준화된
3과-Gateway	digital	디지털의
3과-Gateway	outsourcing	외주화
3과-Gateway	granularity	세분성, 잘게 나뉜 정도
3과-Gateway	transcriber	전사 작업자, 받아쓰기 작업자
3과-Gateway	factories	공장들
3과-Gateway	regulations	규제들
3과-Gateway	taxes	세금
3과-Gateway	paid	지불된다, 납부된다
3-1번	climate	기후
3-1번	regarded	여겨지는
3-1번	localized	국지적인, 국소적인
3-1번	legendary	악명 높은, 유명한
3-1번	constant	지속적인
3-1번	garden	정원, 텃밭
3-1번	lettuce	상추
3-1번	anyone	누구보다도 / 누구든
3-1번	approximately	대략
3-1번	prayed	기도했다
3-1번	gardening	정원 가꾸기, 원예
3-2번	injected	주입된
3-2번	organization	조직
3-2번	promotions	승진(혜택)
3-2번	manipulations	조작, 인위적 통제
3-2번	eventually	결국
3-2번	repeat	반복적인, 재차의
3-2번	trumps	능가한다, 압도한다
3-2번	astronaut	우주비행사
3-2번	inspires	고무한다, प्रेर동한다
3-2번	promote	장려하다
3-2번	questioning	의문 제기, 따져 묻기
3-3번	race	인종
3-3번	penned	(글을) 써냈다
3-3번	statement	말, 진술
3-3번	equally	마찬가지로, 동등하게
3-3번	replaced	대체된
3-3번	ancient	아주 오래된
3-3번	generation	세대
3-3번	manifestation	구체적 발현, 구현물
3-3번	accumulated	축적된
3-3번	blessings	축복, 이로운 것들
3-3번	bombs	폭탄, 치명적 위험요소
3-4번	variety	다양한 이유, 여러 가지
3-4번	laziness	게으름
3-4번	inability	무능, 할 수 없음
3-4번	controversial	논란의 여지가 큰
3-4번	politics	정치
3-4번	philosophy	철학
3-4번	probe	깊이 파고들다, 더 깊이 탐구하다
3-4번	far-fetched	현실성 없어 보이는, 기상천외한
3-4번	geometry	기하학
4과-Gateway	ecosystem	생태계
4과-Gateway	rate	정도, 비율
4과-Gateway	defined	정의된
4과-Gateway	pursuit	추구
4과-Gateway	superior	더 뛰어난
4과-Gateway	creation	창출
4과-Gateway	efficiency	효율성
4과-Gateway	properly	적절하게
4과-Gateway	confidence	신뢰, 확신
4과-Gateway	paramount	가장 중요한
4과-Gateway	required	요구되는
4과-Gateway	emphasis	강조
4과-Gateway	necessity	필요상, 불가피하게
4과-Gateway	cautious	신중한
4과-Gateway	ensure	보장하다
4과-Gateway	neglected	소홀히 다뤄진
4과-Gateway	expense	희생, 대가 (at the expense of ~: ~을 희생하여)
4-1번	increasingly	점점 더
4-1번	constant	거의 일정한, 변함없는
4-1번	civilization	문명
4-2번	engagement	참여, 관여
4-2번	journalists	언론인들, 기자들
4-2번	relevant	관련 있는, 적실성 있는
4-2번	places	지역들, 곳들
4-2번	responsibility	책임
4-2번	accountable	책임지게 하는
4-2번	democratization	민주화, 대중화
4-2번	disruptions	변화, 교란, 기존 질서의 붕괴
4-2번	retake	되찾다, 다시 장악하다
4-2번	dissemination	전파, 확산
4-2번	perhaps	어쩌면
4-2번	essential	필수적인
4-3번	valid	타당한
4-3번	proof	증거
4-3번	efficient	효율적인
4-3번	landed	착륙했다
4-3번	comet	혜성
4-3번	antibiotics	항생제
4-3번	illness	질병
4-3번	immunizations	예방접종
4-3번	accomplishments	성과들, 업적들
4-3번	frequently	자주
4-3번	intuition	직관
4-3번	confirms	입증하다, 확인하다
4-3번	disproves	틀렸음을 입증하다, 반증하다
4-3번	veracity	진실성, 사실 여부
4-3번	consider	고려하다
4-3번	hypothesis	가설
4-3번	evidence	증거
11-1번	assigned	주어져, 부여되어
11-1번	located	찾아낸
11-1번	comparison	비교, 비유
11-1번	discuss	논의하다
11-1번	conclusion	결론
11-1번	determine	결정하다
11-1번	parents	부모들
11-1번	discussion	토론, 논의
11-1번	format	형식
11-2번	Reformist approaches	개혁주의적 접근들
11-2번	reasonable	합리적인
11-2번	efficient	효율적인
11-2번	available	이용 가능한
11-2번	calculations	계산들
11-2번	reasoning	추론하는, 계산 논리를 굴리는
11-2번	marginalising	주변화하는, 배제하는
11-2번	conventional	전통적인, 일반적인
11-2번	retailers	소매업체들
11-2번	distances	먼 거리들
11-2번	labour	노동력
11-2번	organic	유기농의
11-2번	practices	관행들, 실천들
11-2번	wages	임금
11-2번	elite demand	소수 엘리트 수요
11-2번	trade entails	거래가 수반하는 것
11-2번	inequities	불평등들
11-3번	variation	차이, 변이
11-3번	distinct	뚜렷이 구별되는
11-3번	construction	구성물
11-3번	Sociologists prefer	사회학자들은 더 선호한다
11-3번	racialization	인종화
11-3번	ancient	고대의
11-3번	figures	인물들
11-3번	Little	거의 없음, 별로
11-3번	accounts	기록들, 서술들
11-3번	judging	판단하는 것
11-4번	factors contribute	요인들이 기여하다
11-4번	waistlines	허리둘레들
11-4번	particular	특히
11-4번	incidence	발생률
11-4번	obesity	비만
11-4번	Consider	생각해 보라
11-4번	confronted	맞닥뜨리다
11-4번	perceived	인식되는
11-4번	perception	인식
11-4번	appropriate	적절한
11-4번	distortions	왜곡
11-4번	consistently	일관되게, 지속적으로
11-4번	steadily	꾸준히
11-4번	average	평균적인
11-4번	unintentionally	무심코, 의도치 않게
11-4번	offered	제공되는
11-4번	result	초래하다
12-1번	Moral outrage	도덕적 분노
12-1번	punish	처벌하다
12-1번	commitment	헌신, 구속
12-1번	unjust	부당한
12-1번	interpersonal violence	대인 폭력
12-1번	obvious	명백한
12-1번	embodied	신체화된, 몸으로 나타나는
12-1번	pressure	압력 / 혈압
12-1번	recognize	인식하다
12-1번	irrationality	비합리성
12-1번	immediate	즉각적인
12-1번	punishment	처벌
12-1번	justice against	~에 대한 응징적 정의
12-1번	unfavorable evaluation	불리한 판단, 손해 계산
12-1번	involved	휘말린
12-1번	avoiding	피하는
12-2번	counterproductive	역효과를 내는
12-2번	instinct	본능
12-2번	absence	부재
12-2번	species	종, 인류
12-2번	relied	의존했다
12-2번	ingestion	섭취
12-2번	versus	~와 대비하여
12-2번	caution	조심성, 신중함
12-2번	terrific	엄청난, 아주 큰
12-2번	ingredients	성분들
12-2번	expected	기대되는, 당연시되는
12-2번	distant ancestors	먼 조상들
12-2번	regarded	여겼다
12-2번	remedy	치료제, 구제책
12-2번	perceive	인식하다
12-3번	supplements	보충제
12-3번	diagnose	진단하다
12-3번	mitigate	완화하다
12-3번	prevent disease	질병을 예방하다
12-3번	extensive	광범위한
12-3번	effectiveness	효능, 효과성
12-3번	interactions	상호작용
12-3번	substances	물질들
12-3번	approval	승인
12-3번	subsequently	그 후에, 나중에
12-3번	authority	권한
12-3번	government	정부
12-3번	evaluate	평가하다
12-3번	legislators	입법자들, 의원들
12-3번	requiring	요구하는 것, 의무화함
12-3번	shelves	진열대
12-4번	opposed	~와 반대로
12-4번	invites	불러들인다, 이끈다
12-4번	offers	제공한다
12-4번	reassess	재평가하다
12-4번	significance	의미, 중요성
12-4번	remarkably	두드러지게
12-4번	perspective	관점
12-4번	several	몇몇의, 여러
12-4번	reflected	반영된
12-4번	threat	위협
12-4번	requires	요구한다
12-4번	participation	참여
12-4번	analysis	분석
12-4번	explain	설명하다
12-4번	invariable	불변의
13-1번	offers	제시한다
13-1번	account	설명
13-1번	condenses	응결한다
13-1번	concerned	관심 있는, 주로 다루는
13-1번	occurs	일어난다
13-1번	regularity	규칙성
13-1번	allows	가능하게 한다
13-1번	tear	찢다
13-1번	enables	가능하게 한다
13-1번	cause	원인 (final cause 문맥에서는 목적 원인)
13-2번	generator	많이 만들어내는 존재, 생성기
13-2번	immediately	곧바로
13-2번	quantity	양
13-2번	equal odds	많이 내야 좋은 것도 나온다는 등확률 원리
13-2번	arguing	주장하면서
13-2번	correlated	상관되어 있는
13-2번	confirmed	확인했다, 입증했다
13-2번	innovation	혁신
13-2번	distinguish	구별하다
13-2번	failure	실패작, 실패
13-3번	aware of	알아차리는, 인식하는
13-3번	internal sensations	내부 감각들
13-3번	Perhaps	어쩌면
13-3번	faculty	능력
13-3번	bring us	우리를 이끌다
13-3번	contact	접촉, 가까운 연결
13-3번	Interpreting	해석하는 것
13-3번	facial expressions	표정들
13-3번	yield	산출하다, 주다
13-3번	abstract	추상적인
13-3번	stir	일어나다, 움직이다
13-3번	supplying	제공하면서
13-3번	information	정보
13-3번	lacks	부족하다, 갖고 있지 않다
13-3번	interacting	상호작용할 때
13-3번	unconsciously	무의식적으로
13-3번	facial	얼굴의
13-3번	posture	자세
13-3번	borrowing	빌리는 것
13-4번	criticisms	비판들
13-4번	overextension	과도한 확장
13-4번	involve	수반하다, 포함하다
13-4번	dehumanization	비인간화
13-4번	arguments	주장들, 논거들
13-4번	philosopher	철학자
13-4번	primarily	주로
13-4번	cautioned	경고했다
13-4번	decades	수십 년
13-4번	against	~을 경계하며, ~에 반대하여
13-4번	extension	확장
13-4번	famously claimed	유명하게 주장했다
13-4번	rely	의존하다
13-4번	faculties	능력들, 기능들
14-1번	automatic	자동적인
14-1번	participate	참여하다
14-1번	perspectives	관점들
14-1번	involved	관련된
14-1번	arranging	마련하는, 준비하는
14-1번	infant	유아
14-1번	disposition	성향, 기질
14-1번	ensures	보장한다
14-1번	expects	기대한다
14-1번	splashing	물장구치는
14-1번	perhaps	어쩌면
14-1번	terrified	겁에 질린
14-1번	regulate	조절하다
14-1번	hesitate	주저하다
14-2번	anthropological	인류학적인
14-2번	practice	실제 활동, 실제 관행
14-2번	describes	기술한다, 묘사한다
14-2번	elucidation	해명, 규명
14-2번	secreted	분비되는
14-2번	observations	관찰 결과들
14-2번	conviction	확신
14-2번	regarded	여겨지는
14-2번	logical	논리적인
14-2번	coherent	일관된
14-2번	consists	이루어져 있다
14-2번	disordered	무질서한
14-2번	struggle	애쓰다, 고군분투하다
14-2번	consensus	합의
14-2번	formulation	정식화, 정립
14-2번	competing	경쟁하는
14-2번	deserved	받을 자격이 있었다
14-2번	credit	공로
14-3번	gamelans	가믈란(인도네시아 전통 합주단)
14-3번	experience	감상 경험
14-3번	indeed	실제로, 정말로
14-3번	unnecessarily	불필요하게
14-3번	presence	존재, 등장
14-3번	realizing	실현하는, 구현하는
14-3번	orchestra	오케스트라
14-3번	accompanying	반주하는, 동반하는
14-4번	discussed	논의된
14-4번	consisted	구성되었다
14-4번	composed	구성된
14-4번	struggling	고전하는, 실력이 부족한
14-4번	comprehension	이해력
14-4번	deficit	부족
14-4번	enabled	가능하게 했다
14-4번	outscore	점수에서 앞서다
14-4번	abilities	능력들
14-4번	prior	사전의, 기존의
14-4번	brings	가져온다
14-4번	approach	접근하다 / 접근 방식
24	domesticated	길들여진, 너무 익숙해진
24	actually	실제로
24	accessible	접근하기 쉬운
24	approachable	가깝게 느껴지는, 친숙한
24	evaporates	사라져 버린다, 증발하듯 없어지다
24	visibility	가시성, 눈에 띔
24	accumulates	쌓아 올리다, 축적하다
24	imitations	모방물들
24	analysis	분석
24	bury	묻어 버리다, 가려 버리다
24	precisely	정확히 바로 그 방식으로
24	reinforces	강화한다
24	enhances	더 돋보이게 한다, 향상시킨다
24	inherent	내재된
30	conceptualize	개념화하다
30	categorize	범주화하다, 분류하다
30	abstract	추려 내다, 추상화하다
30	ordinary	일반적인, 평범한
30	varieties	다양한 종류들
30	individuality	개별성
30	uniqueness	고유성, 독특함
30	glance	흘끗 봄
30	uniformly	균일하게
30	stadium	경기장
30	constituent	구성하는
30	distinct	뚜렷이 구별되는, 고유한
37	resist	억누르다, 참다
37	urge	충동, 강한 욕구
37	instinct	본능
37	contrast	대조
37	entity	독립적 실체
37	dimension	차원
37	structure	구조
37	sure	확신하는
37	least	가장 적게, 가장 덜
37	accurate	정확한
37	within	~의 내부에서
37	fabric	구조, 짜임
37	embedded	내재된, 박혀 있는
39	transparent	투명한
39	practices	관행들, 실제 방식들
39	relevant	관련된
39	acquire	습득하다, 얻다
39	epistemic	지식의, 앎과 관련된
39	admittance	입문 허가, 가입 허용
39	premodern	전근대의
39	strategies	전략들
39	accessible	접근 가능한, 이해 가능한
39	realistically	현실적으로`;

  var WORDS = RAW_WORDS.trim().split(/\n/).map(function (row) {
    var parts = row.split("\t");
    return {
      section: parts[0],
      word: parts[1],
      meaning: parts.slice(2).join("\t")
    };
  });

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function shuffle(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  var SPEED_SECONDS = 3;

  function answerLetters(item) {
    return String(item.word || "").replace(/[^A-Za-z]/g, "");
  }

  function makeLetterTiles(item) {
    var target = answerLetters(item);
    var base = target.split("").map(function (char, index) {
      return { char: char, id: index };
    });
    var tiles = base;
    for (var attempt = 0; attempt < 8; attempt += 1) {
      tiles = shuffle(base);
      if (tiles.map(function (tile) { return tile.char; }).join("").toLowerCase() !== target.toLowerCase()) {
        break;
      }
    }
    return tiles;
  }

  function selectedLetters(state) {
    return state.scramblePicked.map(function (tileIndex) {
      return state.scrambleTiles[tileIndex].char;
    }).join("");
  }

  function isTileUsed(state, tileIndex) {
    return state.scramblePicked.indexOf(tileIndex) !== -1;
  }

  function answerSlotsHtml(item, selected, picked) {
    var source = String(item.word || "");
    var letterIndex = 0;
    return source.split("").map(function (char) {
      if (/[A-Za-z]/.test(char)) {
        var value = selected.charAt(letterIndex);
        var pickedIndex = letterIndex;
        letterIndex += 1;
        if (value) {
          return '<button class="answer-slot filled" type="button" data-action="untap-letter" data-picked-index="' + pickedIndex + '">' + escapeHtml(value) + "</button>";
        }
        return '<span class="answer-slot"></span>';
      }
      if (/\s/.test(char)) {
        return '<span class="slot-gap"></span>';
      }
      return '<span class="slot-fixed">' + escapeHtml(char) + "</span>";
    }).join("");
  }

  function sections() {
    var seen = Object.create(null);
    return WORDS.map(function (item) {
      return item.section;
    }).filter(function (section) {
      if (seen[section]) return false;
      seen[section] = true;
      return true;
    });
  }

  registry["wordtest-1-1"] = {
    render: function (ctx) {
      var root = ctx.root;
      var timer = null;
      var speedDelay = null;
      var sectionList = ["전체"].concat(sections());
      var state = {
        mode: "scramble",
        section: "전체",
        sessionStarted: false,
        scrambleScore: 0,
        scrambleItem: null,
        scrambleTiles: [],
        scramblePicked: [],
        scrambleSolved: false,
        scrambleFeedback: "",
        timerEnabled: false,
        timerSeconds: SPEED_SECONDS,
        speedRemainingMs: SPEED_SECONDS * 1000,
        speedScore: 0,
        speedMiss: 0,
        speedItem: null,
        speedChoices: [],
        speedPicked: null,
        speedFeedback: ""
      };

      ctx.setSubtitle(WORDS.length + " words · scramble / 선다형");

      function pool() {
        var selected = state.section;
        var list = selected === "전체" ? WORDS : WORDS.filter(function (item) {
          return item.section === selected;
        });
        return list.length ? list : WORDS;
      }

      function resetRound(resetScores) {
        stopSpeed(true);
        state.sessionStarted = false;
        state.scrambleItem = null;
        state.scrambleTiles = [];
        state.scramblePicked = [];
        state.scrambleSolved = false;
        state.scrambleFeedback = "";
        state.speedItem = null;
        state.speedChoices = [];
        state.speedPicked = null;
        state.speedFeedback = "";
        if (resetScores) {
          state.scrambleScore = 0;
          state.speedScore = 0;
          state.speedMiss = 0;
        }
      }

      function timerTotalMs() {
        return state.timerSeconds * 1000;
      }

      function timerPanelHtml() {
        return [
          '<div class="timer-panel">',
          '<div class="timer-label">타이머</div>',
          '<div class="timer-time">',
          '<button type="button" data-action="timer-down" aria-label="timer down">‹</button>',
          '<strong>' + state.timerSeconds + '초</strong>',
          '<button type="button" data-action="timer-up" aria-label="timer up">›</button>',
          '</div>',
          '<button class="timer-toggle' + (state.timerEnabled ? " active" : "") + '" type="button" data-action="toggle-timer">' + (state.timerEnabled ? "ON · 2단계" : "OFF · 1단계") + '</button>',
          '</div>'
        ].join("");
      }

      function renderShell() {
        var options = sectionList.map(function (section) {
          var selected = section === state.section ? " selected" : "";
          var label = section === "전체" ? "전체 범위" : section;
          return '<option value="' + escapeHtml(section) + '"' + selected + ">" + escapeHtml(label) + "</option>";
        }).join("");

        root.innerHTML = [
          '<style>',
          '.wordtest{height:100%;min-height:640px;background:radial-gradient(circle at 12% 8%,rgba(142,165,103,.34),transparent 30%),radial-gradient(circle at 88% 4%,rgba(174,132,84,.22),transparent 34%),linear-gradient(135deg,#f7f4ea 0%,#eaf0dd 52%,#f2e3cf 100%);color:#4a432e;padding:18px;overflow:auto;font-family:"SUIT","Pretendard","Segoe UI","Malgun Gothic",sans-serif}',
          '.wordtest-card{max-width:1120px;margin:0 auto;background:rgba(255,252,244,.88);backdrop-filter:blur(16px);border:1px solid rgba(93,86,55,.16);border-radius:28px;box-shadow:0 24px 70px rgba(103,89,51,.16);padding:22px}',
          '.wordtest-head{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:16px;align-items:start;margin-bottom:16px}',
          '.wordtest-main{min-width:0;display:grid;gap:12px;align-content:start}',
          '.wordtest h2{margin:0;font-size:30px;letter-spacing:-.04em;color:#514326}.wordtest p{margin:7px 0 0;color:#756d4f;font-size:14px}',
          '.wordtest-count{border-radius:999px;background:#7a7048;color:#fffaf0;padding:10px 14px;font-size:13px;font-weight:850;white-space:nowrap}',
          '.timer-panel{width:230px;justify-self:end;border:1px solid rgba(93,86,55,.2);border-radius:24px;background:linear-gradient(160deg,rgba(255,252,244,.95),rgba(232,239,216,.86));padding:14px;box-shadow:0 14px 34px rgba(103,89,51,.12)}',
          '.timer-label{font-size:12px;font-weight:950;letter-spacing:.08em;color:#756d4f;text-transform:uppercase;margin-bottom:8px}.timer-time{display:grid;grid-template-columns:42px 1fr 42px;gap:8px;align-items:center;margin-bottom:10px}.timer-time strong{font-size:30px;letter-spacing:-.05em;text-align:center;color:#5e5838}.timer-time button{height:42px;padding:0!important;border-radius:14px!important;font-size:24px!important}.timer-toggle{width:100%;justify-content:center}',
          '.wordtest-tools{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0}',
          '.wordtest-mode,.timer-toggle,.wordtest button{border:1px solid rgba(93,86,55,.18);background:rgba(255,252,244,.88);color:#55482b;border-radius:16px;padding:10px 14px;font-weight:850;cursor:pointer;box-shadow:0 8px 20px rgba(103,89,51,.07);transition:transform .14s ease,background .14s ease,box-shadow .14s ease}',
          '.wordtest button:hover{transform:translateY(-1px);box-shadow:0 12px 24px rgba(103,89,51,.12)}.wordtest button:disabled{cursor:default;opacity:.38;transform:none;box-shadow:none}',
          '.wordtest-mode.active,.timer-toggle.active,.wordtest button.primary{background:#78844f;color:#fffaf0;border-color:#78844f}',
          '.wordtest select{border:1px solid rgba(93,86,55,.2);background:rgba(255,252,244,.92);border-radius:16px;padding:11px 13px;font-size:15px;color:#55482b;font-weight:750}',
          '.wordtest-stage{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:16px}',
          '.wordtest-panel{background:rgba(255,252,244,.76);border:1px solid rgba(93,86,55,.14);border-radius:24px;padding:20px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}',
          '.wordtest-side{background:linear-gradient(180deg,rgba(120,132,79,.14),rgba(255,252,244,.7));border:1px solid rgba(93,86,55,.14);border-radius:24px;padding:18px}',
          '.kicker{font-size:12px;font-weight:950;letter-spacing:.09em;text-transform:uppercase;color:#756d4f;margin-bottom:10px}',
          '.meaning{font-size:clamp(24px,4vw,40px);font-weight:950;letter-spacing:-.045em;line-height:1.18;margin:8px 0 16px}',
          '.scramble-board{display:grid;gap:16px}.answer-slots{display:flex;flex-wrap:wrap;gap:8px;align-items:center;min-height:58px;padding:14px;border-radius:20px;background:rgba(120,132,79,.1)}',
          '.answer-slot{width:34px;height:42px!important;padding:0!important;border-radius:12px!important;background:#fffdf7;border:1px solid rgba(93,86,55,.16);display:grid;place-items:center;font-size:22px!important;font-weight:950!important;text-transform:uppercase;box-shadow:inset 0 -2px 0 rgba(103,89,51,.08)}.answer-slot.filled{background:#e8efd8!important;border-color:#9daa6c!important}.slot-gap{width:18px}.slot-fixed{font-size:24px;font-weight:950;color:#7a7048;align-self:center}',
          '.letter-bank{display:flex;flex-wrap:wrap;gap:9px}.letter-tile{min-width:42px;height:44px;padding:0 13px!important;border-radius:14px!important;background:#8a7549!important;color:#fffaf0!important;font-size:20px;font-weight:950;text-transform:uppercase}.letter-tile.used{visibility:hidden}',
          '.answer-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}',
          '.feedback{min-height:28px;margin-top:12px;font-weight:950}.feedback.good{color:#627b37}.feedback.bad{color:#a75b37}',
          '.answer-reveal{margin-top:10px;padding:12px 14px;border-radius:16px;background:#eef3df;font-weight:850}',
          '.stats{display:grid;gap:10px}.stat{background:rgba(255,252,244,.74);border-radius:18px;padding:12px}.stat strong{display:block;font-size:28px;letter-spacing:-.04em;color:#5e5838}',
          '.speed-word{font-size:clamp(34px,6vw,66px);font-weight:950;letter-spacing:-.055em;margin:14px 0 18px}',
          '.choices{display:grid;grid-template-columns:1fr 1fr;gap:10px}.choice{min-height:72px;text-align:left;background:rgba(255,252,244,.92)}.choice.correct{background:#e6efd2!important;border-color:#9daa6c!important}.choice.wrong{background:#f2d5c5!important;border-color:#bd7956!important}',
          '.timer-bar{height:12px;border-radius:999px;background:rgba(120,132,79,.18);overflow:hidden;margin:4px 0 18px}.timer-fill{display:block;height:100%;width:100%;border-radius:inherit;background:linear-gradient(90deg,#a48b54,#7f8d52);transition:width .08s linear}',
          '.finish{font-size:28px;font-weight:950;margin:12px 0}.muted{color:#756d4f;font-size:13px;line-height:1.5}',
          '@media(max-width:820px){.wordtest{padding:12px}.wordtest-card{padding:16px}.wordtest-head,.wordtest-stage{display:block}.timer-panel{width:100%;margin-top:12px}.wordtest-side{margin-top:12px}.choices{grid-template-columns:1fr}.answer-slot{width:30px;height:38px}.letter-tile{min-width:38px;height:42px}}',
          '</style>',
          '<div class="wordtest"><div class="wordtest-card">',
          '<div class="wordtest-head"><div class="wordtest-main"><div><h2>단어 테스트</h2><p>문제 타입은 scramble / 선다형, 타이머 OFF는 1단계 · ON은 2단계.</p><p class="muted">' + WORDS.length + ' words</p></div><div class="wordtest-tools">',
          '<button class="wordtest-mode' + (state.mode === "scramble" ? " active" : "") + '" type="button" data-mode="scramble">scramble</button>',
          '<button class="wordtest-mode' + (state.mode === "choice" ? " active" : "") + '" type="button" data-mode="choice">선다형</button>',
          '<select id="wordtest-section" aria-label="section filter">' + options + '</select>',
          '</div></div>' + timerPanelHtml() + '</div>',
          '<div id="wordtest-stage"></div>',
          '</div></div>'
        ].join("");
      }

      function pickScramble() {
        var item = pick(pool());
        state.scrambleItem = item;
        state.scrambleTiles = makeLetterTiles(item);
        state.scramblePicked = [];
        state.scrambleSolved = false;
        state.scrambleFeedback = "";
      }

      function renderScramble() {
        if (!state.scrambleItem) pickScramble();
        var item = state.scrambleItem;
        var selected = selectedLetters(state);
        var feedbackClass = state.scrambleFeedback.indexOf("정답") >= 0 ? " good" : state.scrambleFeedback ? " bad" : "";
        var reveal = state.scrambleSolved ? '<div class="answer-reveal">정답: ' + escapeHtml(item.word) + '</div>' : "";
        var tiles = state.scrambleTiles.map(function (tile, index) {
          var used = isTileUsed(state, index);
          return '<button class="letter-tile' + (used ? " used" : "") + '" type="button" data-action="tap-letter" data-index="' + index + '"' + (used || state.scrambleSolved ? " disabled" : "") + ">" + escapeHtml(tile.char) + "</button>";
        }).join("");

        root.querySelector("#wordtest-stage").innerHTML = [
          '<div class="wordtest-stage">',
          '<section class="wordtest-panel">',
          '<div class="kicker">scramble · ' + (state.timerEnabled ? "2단계" : "1단계") + ' · ' + escapeHtml(item.section) + '</div>',
          timerBarHtml(),
          '<div class="meaning">' + escapeHtml(item.meaning) + '</div>',
          '<div class="scramble-board">',
          '<div class="answer-slots">' + answerSlotsHtml(item, selected, state.scramblePicked) + '</div>',
          '<div class="letter-bank">' + tiles + '</div>',
          '</div>',
          '<div class="answer-row">',
          '<button type="button" data-action="next-scramble">다음</button>',
          '<button type="button" data-action="clear-scramble">지우기</button>',
          '</div>',
          '<div class="feedback' + feedbackClass + '">' + escapeHtml(state.scrambleFeedback) + '</div>',
          reveal,
          '</section>',
          '<aside class="wordtest-side"><div class="stats">',
          '<div class="stat"><span>단계</span><strong>' + (state.timerEnabled ? "2단계" : "1단계") + '</strong></div>',
          '<div class="stat"><span>맞힌 단어</span><strong>' + state.scrambleScore + '</strong></div>',
          '<div class="stat"><span>현재 범위</span><strong>' + pool().length + '</strong></div>',
          '<div class="muted">아래 알파벳을 순서대로 눌러 영어 단어를 완성합니다. 띄어쓰기와 기호는 슬롯에 자동으로 표시됩니다.</div>',
          '</div></aside>',
          '</div>'
        ].join("");
      }

      function tapLetter(index) {
        if (state.scrambleSolved || isTileUsed(state, index) || !state.scrambleTiles[index]) return;
        state.scramblePicked.push(index);
        state.scrambleFeedback = "";
        var target = answerLetters(state.scrambleItem);
        if (state.scramblePicked.length < target.length) {
          renderScramble();
          return;
        }

        var correct = selectedLetters(state).toLowerCase() === target.toLowerCase();
        if (correct) {
          state.scrambleScore += 1;
          state.scrambleSolved = true;
          state.scrambleFeedback = "정답입니다!";
          clearSpeedTimer();
        } else {
          state.scrambleFeedback = "다시 배열해보세요!";
        }
        renderScramble();
      }

      function untapLetter(pickedIndex) {
        if (state.scrambleSolved) return;
        if (pickedIndex < 0 || pickedIndex >= state.scramblePicked.length) return;
        state.scramblePicked.splice(pickedIndex, 1);
        state.scrambleFeedback = "";
        renderScramble();
      }

      function clearScramble() {
        state.scramblePicked = [];
        state.scrambleSolved = false;
        state.scrambleFeedback = "";
        renderScramble();
        startScrambleTimer();
      }

      function renderLanding() {
        var modeName = state.mode === "choice" ? "선다형" : "scramble";
        var guide = state.mode === "choice"
          ? "영어 단어를 보고 제한 시간 안에 한국어 뜻을 고릅니다."
          : "제한 시간 안에 알파벳 타일을 순서대로 눌러 단어를 완성합니다.";
        root.querySelector("#wordtest-stage").innerHTML = [
          '<div class="wordtest-stage">',
          '<section class="wordtest-panel">',
          '<div class="kicker">' + modeName + ' · 2단계 준비</div>',
          '<div class="meaning">' + state.timerSeconds + '초 타이머</div>',
          '<p class="muted">' + guide + '</p>',
          '<div class="answer-row">',
          '<button class="primary" type="button" data-action="start-timed">시작</button>',
          '</div>',
          '</section>',
          '<aside class="wordtest-side"><div class="stats">',
          '<div class="stat"><span>모드</span><strong>' + modeName + '</strong></div>',
          '<div class="stat"><span>범위</span><strong>' + pool().length + '</strong></div>',
          '<div class="muted">타이머 시간은 우측 상단 화살표로 바꿉니다. 타이머를 켜거나 시간을 바꾸면 진행 중 문제는 리셋됩니다.</div>',
          '</div></aside>',
          '</div>'
        ].join("");
      }

      function timerBarHtml() {
        if (!state.timerEnabled) return "";
        var total = timerTotalMs();
        var percent = Math.max(0, Math.min(100, (state.speedRemainingMs / total) * 100));
        return '<div class="timer-bar" aria-label="timer"><span class="timer-fill" style="width:' + percent.toFixed(1) + '%"></span></div>';
      }

      function renderSpeed() {
        var stage = root.querySelector("#wordtest-stage");
        if (!state.speedItem) setChoiceQuestion();

        var item = state.speedItem;
        var choices = state.speedChoices.map(function (choice, index) {
          var cls = "choice";
          if (state.speedPicked === index) cls += choice === item ? " correct" : " wrong";
          if (state.speedPicked != null && choice === item) cls += " correct";
          return '<button class="' + cls + '" type="button" data-action="speed-choice" data-index="' + index + '">' + escapeHtml(choice.meaning) + '</button>';
        }).join("");
        stage.innerHTML = [
          '<div class="wordtest-stage">',
          '<section class="wordtest-panel">',
          '<div class="kicker">선다형 · ' + (state.timerEnabled ? "2단계" : "1단계") + ' · ' + escapeHtml(item.section) + '</div>',
          timerBarHtml(),
          '<div class="speed-word">' + escapeHtml(item.word) + '</div>',
          '<div class="choices">' + choices + '</div>',
          '<div class="feedback">' + escapeHtml(state.speedFeedback) + '</div>',
          '</section>',
          '<aside class="wordtest-side"><div class="stats">',
          '<div class="stat"><span>단계</span><strong>' + (state.timerEnabled ? "2단계" : "1단계") + '</strong></div>',
          '<div class="stat"><span>정답</span><strong>' + state.speedScore + '</strong></div>',
          '<div class="stat"><span>오답</span><strong>' + state.speedMiss + '</strong></div>',
          '<button type="button" data-action="next-choice">다음</button>',
          '</div></aside>',
          '</div>'
        ].join("");
      }

      function clearSpeedTimer() {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }

      function scheduleNextSpeedQuestion() {
        if (speedDelay) {
          clearTimeout(speedDelay);
        }
        speedDelay = setTimeout(function () {
          speedDelay = null;
          if (state.mode === "choice") {
            state.speedFeedback = "";
            nextSpeedQuestion();
          }
        }, 520);
      }

      function startQuestionTimer() {
        clearSpeedTimer();
        if (!state.timerEnabled) return;
        var totalMs = timerTotalMs();
        var startedAt = Date.now();
        state.speedRemainingMs = totalMs;
        timer = setInterval(function () {
          state.speedRemainingMs = Math.max(0, totalMs - (Date.now() - startedAt));
          if (state.speedRemainingMs <= 0) {
            state.speedMiss += 1;
            state.speedPicked = -1;
            state.speedFeedback = "시간 초과: " + state.speedItem.meaning;
            clearSpeedTimer();
            renderSpeed();
            scheduleNextSpeedQuestion();
            return;
          }
          renderSpeed();
        }, 80);
      }

      function startScrambleTimer() {
        clearSpeedTimer();
        if (!state.timerEnabled) return;
        var totalMs = timerTotalMs();
        var startedAt = Date.now();
        state.speedRemainingMs = totalMs;
        timer = setInterval(function () {
          state.speedRemainingMs = Math.max(0, totalMs - (Date.now() - startedAt));
          if (state.speedRemainingMs <= 0) {
            state.scrambleSolved = true;
            state.scrambleFeedback = "시간 초과";
            clearSpeedTimer();
            renderScramble();
            return;
          }
          renderScramble();
        }, 80);
      }

      function setChoiceQuestion() {
        var list = pool();
        var item = pick(list);
        var distractors = shuffle(list.filter(function (candidate) {
          return candidate !== item && candidate.meaning !== item.meaning;
        })).slice(0, 3);
        state.speedItem = item;
        state.speedChoices = shuffle([item].concat(distractors));
        state.speedPicked = null;
        state.speedRemainingMs = timerTotalMs();
      }

      function nextSpeedQuestion() {
        clearSpeedTimer();
        if (speedDelay) {
          clearTimeout(speedDelay);
          speedDelay = null;
        }
        setChoiceQuestion();
        renderSpeed();
        startQuestionTimer();
      }

      function stopSpeed(resetRemaining) {
        clearSpeedTimer();
        if (speedDelay) {
          clearTimeout(speedDelay);
          speedDelay = null;
        }
        if (resetRemaining) state.speedRemainingMs = timerTotalMs();
      }

      function answerSpeed(index) {
        if (state.mode !== "choice" || state.speedPicked != null) return;
        var choice = state.speedChoices[index];
        if (!choice) return;
        clearSpeedTimer();
        var ok = choice === state.speedItem;
        state.speedPicked = index;
        state.speedFeedback = ok ? "정답" : "오답: " + state.speedItem.meaning;
        if (ok) state.speedScore += 1;
        else state.speedMiss += 1;
        renderSpeed();
        if (state.timerEnabled) {
          scheduleNextSpeedQuestion();
        }
      }

      function startTimedMode() {
        state.sessionStarted = true;
        stopSpeed(true);
        if (state.mode === "choice") {
          state.speedItem = null;
          nextSpeedQuestion();
          return;
        }
        pickScramble();
        renderScramble();
        startScrambleTimer();
      }

      function renderMode() {
        renderShell();
        if (state.timerEnabled && !state.sessionStarted) {
          renderLanding();
        } else if (state.mode === "choice") {
          if (!state.speedItem) setChoiceQuestion();
          renderSpeed();
          if (state.timerEnabled) startQuestionTimer();
        } else {
          renderScramble();
          if (state.timerEnabled) startScrambleTimer();
        }
        root.querySelector("#wordtest-section").addEventListener("change", function (event) {
          state.section = event.target.value;
          resetRound(false);
          renderMode();
        });
      }

      function handleClick(event) {
        var modeButton = event.target.closest("[data-mode]");
        if (modeButton) {
          state.mode = modeButton.getAttribute("data-mode");
          resetRound(false);
          renderMode();
          return;
        }

        var actionEl = event.target.closest("[data-action]");
        if (!actionEl) return;
        var action = actionEl.getAttribute("data-action");
        if (action === "tap-letter") tapLetter(Number(actionEl.getAttribute("data-index")));
        if (action === "untap-letter") untapLetter(Number(actionEl.getAttribute("data-picked-index")));
        if (action === "next-scramble") {
          pickScramble();
          renderScramble();
          if (state.timerEnabled) startScrambleTimer();
        }
        if (action === "clear-scramble") clearScramble();
        if (action === "toggle-timer") {
          state.timerEnabled = !state.timerEnabled;
          resetRound(true);
          renderMode();
        }
        if (action === "timer-down") {
          state.timerSeconds = Math.max(2, state.timerSeconds - 1);
          state.speedRemainingMs = timerTotalMs();
          if (state.timerEnabled) resetRound(true);
          renderMode();
        }
        if (action === "timer-up") {
          state.timerSeconds = Math.min(15, state.timerSeconds + 1);
          state.speedRemainingMs = timerTotalMs();
          if (state.timerEnabled) resetRound(true);
          renderMode();
        }
        if (action === "start-timed") startTimedMode();
        if (action === "next-choice") nextSpeedQuestion();
        if (action === "speed-choice") answerSpeed(Number(actionEl.getAttribute("data-index")));
      }

      root.addEventListener("click", handleClick);
      renderMode();

      return function cleanup() {
        stopSpeed(false);
        root.removeEventListener("click", handleClick);
      };
    }
  };
})();
