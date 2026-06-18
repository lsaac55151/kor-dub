const fs = require('fs');
const path = require('path');

// 설정 정보
const CONFIG = {
  jsonPath: path.join(__dirname, 'dub_list.json'),
  imageDir: path.join(__dirname, 'images'),
  githubUser: 'lsaac55151',
  githubRepo: 'kor-dub',
  branch: 'main',
  baseProxyUrl: 'https://images.weserv.nl/?url=',
};

/**
 * 이미지 폴더를 스캔하여 파일명(확장자 제외)과 실제 확장자를 맵핑한 객체를 반환합니다.
 */
function scanImages(dir) {
  const imageMap = {};
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️ 경고: 이미지 폴더를 찾을 수 없습니다: ${dir}`);
    return imageMap;
  }

  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    const name = path.basename(file, ext);
    // 지원하는 이미지 확장자만 필터링
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext)) {
      imageMap[name] = ext;
    }
  });
  return imageMap;
}

/**
 * 메인 실행 함수
 */
function updateJson() {
  console.log('🚀 JSON 업데이트를 시작합니다...');

  // 1. 이미지 폴더 스캔
  const imageMap = scanImages(CONFIG.imageDir);

  // 2. JSON 파일 읽기
  if (!fs.existsSync(CONFIG.jsonPath)) {
    console.error(`❌ 에러: JSON 파일을 찾을 수 없습니다: ${CONFIG.jsonPath}`);
    return;
  }

  let dubList;
  try {
    const rawData = fs.readFileSync(CONFIG.jsonPath, 'utf8');
    dubList = JSON.parse(rawData);
  } catch (err) {
    console.error(`❌ 에러: JSON 파싱 실패: ${err.message}`);
    return;
  }

  if (!Array.isArray(dubList)) {
    console.error('❌ 에러: JSON 데이터가 배열 형식이 아닙니다.');
    return;
  }

  // 3. 데이터 변환
  let updatedCount = 0;
  let missingCount = 0;

  const updatedList = dubList.map(item => {
    const title = item.title;
    const ext = imageMap[title];

    if (ext) {
      // 이미지 파일이 존재하는 경우: 규칙에 맞게 주소 생성
      const fileNameWithExt = title + ext;
      // manual_downloader.py와 동일한 인코딩 방식을 위해 ( ) 등 일부 특수문자 유지
      const encodedFileName = encodeURIComponent(fileNameWithExt)
        .replace(/%28/g, '(')
        .replace(/%29/g, ')')
        .replace(/%7E/g, '~');
      
      const rawGithubUrl = `https://raw.githubusercontent.com/${CONFIG.githubUser}/${CONFIG.githubRepo}/refs/heads/${CONFIG.branch}/images/${encodedFileName}`;
      item.thumbnail = `${CONFIG.baseProxyUrl}${rawGithubUrl}`;
      updatedCount++;
    } else {
      // 이미지 파일이 없는 경우
      missingCount++;
    }
    return item;
  });

  // 4. ID 기준 내림차순 정렬 (최신 항목 상단 노출)
  updatedList.sort((a, b) => (b.id || 0) - (a.id || 0));

  // 5. 파일 저장
  try {
    const outputData = JSON.stringify(updatedList, null, 2);
    fs.writeFileSync(CONFIG.jsonPath, outputData, 'utf8');
    console.log('\n========================================');
    console.log('✅ 업데이트 완료!');
    console.log(`✨ 업데이트된 항목: ${updatedCount}개`);
    console.log(`❓ 이미지가 없는 항목: ${missingCount}개`);
    console.log('========================================');
  } catch (err) {
    console.error(`❌ 에러: 파일 저장 실패: ${err.message}`);
  }
}

// 스크립트 실행
updateJson();
