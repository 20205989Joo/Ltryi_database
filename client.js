document.addEventListener("DOMContentLoaded", function() {
    // 서버에 데이터를 보내는 함수
    function saveResults() {
        const resultsHtml = document.getElementById('results').innerHTML;
        const testCount = localStorage.getItem('testCount') || 0;
        console.log("Sending data:", { resultsHtml, testCount }); // 전송 데이터 로그 출력

        axios.post('https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/saveResults', {
            resultsHtml,
            testCount
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log(response.data);
            alert('Results saved successfully!');
            // 성공 메시지를 표시하는 창을 추가
            document.getElementById('responseMessage').innerText = 'Results saved successfully!';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to save results.');
            // 실패 메시지를 표시하는 창을 추가
            document.getElementById('responseMessage').innerText = 'Failed to save results.';
        });
    }

    // 버튼 클릭 시 서버에 데이터를 보내도록 설정
    document.getElementById('saveButton').addEventListener('click', saveResults);
});
