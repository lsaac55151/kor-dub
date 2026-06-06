const fs = require('fs');
const path = require('path');

// 설정값
const CONFIG = {
    jsonPath: path.join(__dirname, 'dub_list.json'),
    imagesDir: path.join(__dirname, 'images'),
    githubBaseUrl: 'https://images.weserv.nl/?url=https://raw.githubusercontent.com/lsaac55151/kor-dub/refs/heads/main/images/'
};

function updateThumbnails() {
    try {
        // 1. images 폴더 스캔 (파일명 -> 전체 파일명 매핑 생성)
        if (!fs.existsSync(CONFIG.imagesDir)) {
            console.error('Error: images 폴더를 찾을 수 없습니다.');
            return;
        }

        const files = fs.readdirSync(CONFIG.imagesDir);
        const imageMap = new Map();

        files.forEach(file => {
            const ext = path.extname(file);
            const name = path.basename(file, ext);
            // 타이틀과 매칭하기 위해 확장자를 제외한 이름을 키로 저장
            imageMap.set(name, file);
        });

        console.log(`스캔 완료: ${imageMap.size}개의 이미지 파일을 찾았습니다.`);

        // 2. dub_list.json 읽기
        if (!fs.existsSync(CONFIG.jsonPath)) {
            console.error('Error: dub_list.json 파일을 찾을 수 없습니다.');
            return;
        }

        const rawData = fs.readFileSync(CONFIG.jsonPath, 'utf8');
        let dubList = JSON.parse(rawData);

        if (!Array.isArray(dubList)) {
            console.error('Error: JSON 데이터가 배열 형식이 아닙니다.');
            return;
        }

        // 3. 데이터 순회 및 업데이트
        let updatedCount = 0;
        let missingTitles = [];

        const updatedList = dubList.map(item => {
            const title = item.title;
            
            // 1단계: 정확한 일치 확인
            let matchedFile = imageMap.get(title);

            // 2단계: 특수문자 치환 후 재시도 (윈도우 파일명 제한 때문)
            if (!matchedFile) {
                const normalizedTitle = title
                    .replace(/[:\\/|*?"<>]/g, '_') // 금지 문자 -> _
                    .replace(/\s+/g, ' ')           // 다중 공백 -> 단일 공백
                    .trim();
                
                matchedFile = imageMap.get(normalizedTitle);
                
                // 3단계: 공백이나 특수문자 처리가 미세하게 다를 경우를 대비해 
                // 모든 파일명과 타이틀을 공백 제거 후 비교
                if (!matchedFile) {
                    const superNormalizedTitle = normalizedTitle.replace(/\s/g, '');
                    for (const [name, file] of imageMap.entries()) {
                        if (name.replace(/\s/g, '').replace(/[:\\/|*?"<>]/g, '_') === superNormalizedTitle) {
                            matchedFile = file;
                            break;
                        }
                    }
                }
            }

            if (matchedFile) {
                const encodedFileName = encodeURIComponent(matchedFile);
                item.thumbnail = `${CONFIG.githubBaseUrl}${encodedFileName}`;
                updatedCount++;
            } else {
                missingTitles.push(title);
            }
            return item;
        });

        // 4. 결과 저장
        fs.writeFileSync(CONFIG.jsonPath, JSON.stringify(updatedList, null, 2), 'utf8');

        console.log('\n--- 작업 완료 보고서 ---');
        console.log(`총 아이템 수: ${updatedList.length}`);
        console.log(`업데이트 성공: ${updatedCount}`);
        console.log(`이미지 누락: ${missingTitles.length}`);
        
        if (missingTitles.length > 0) {
            console.log('\n[누락된 아이템 목록]');
            missingTitles.forEach((t, i) => console.log(`${i + 1}. ${t}`));
        }
        console.log('------------------------');
        console.log('결과가 dub_list.json에 저장되었습니다.');

    } catch (error) {
        console.error('오류 발생:', error.message);
    }
}

// 실행
updateThumbnails();
