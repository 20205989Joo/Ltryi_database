(function () {
  var registry = window.YSUserApps = window.YSUserApps || {};

  registry.fragments = {
    render: function (ctx) {
      ctx.setSubtitle("Fragments workspace");
      ctx.root.innerHTML = [
        '<style>',
        '.fragments-app{height:100%;min-height:620px;background:#eef3e9;color:#1f2b1f;padding:22px;display:grid;place-items:center;font-family:Georgia,"Malgun Gothic",serif}',
        '.fragments-card{width:min(760px,100%);border:1px solid rgba(42,54,39,.16);border-radius:28px;background:rgba(255,255,255,.76);box-shadow:0 18px 44px rgba(42,54,39,.12);padding:34px;text-align:center}',
        '.fragments-card h2{margin:0 0 10px;font-size:34px;letter-spacing:-.04em}',
        '.fragments-card p{margin:0;color:#66715f;font-size:15px}',
        '</style>',
        '<div class="fragments-app">',
        '<section class="fragments-card">',
        '<h2>fragments</h2>',
        '<p>아직 비어있는 작업 공간입니다.</p>',
        '</section>',
        '</div>'
      ].join("");
    }
  };
})();
