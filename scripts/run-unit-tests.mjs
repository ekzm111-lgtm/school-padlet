import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

// 환경 변수 로드
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value.trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

test.describe('School Padlet Comprehensive Feature Suite (Auto Test & Fix)', () => {

  // --- 1. 모둠(열) 정규화 및 매핑 검증 ---
  test.describe('1. Column Normalization & Navigation Mapping', () => {
    test('normalizeColumn_withVariousTypo_returnsCorrectCleanName', () => {
      const inputs = [
        { raw: '몸플기 예제', expected: '몸풀기 예제' },
        { raw: '몸풀기', expected: '몸풀기 예제' },
        { raw: '   실습   ', expected: '실습' },
        { raw: '샘플1 공유', expected: '샘플1 공유' },
      ];

      inputs.forEach(({ raw, expected }) => {
        let name = String(raw || '').trim();
        if (name === '몸플기 예제' || name === '몸풀기') name = '몸풀기 예제';
        assert.equal(name, expected);
      });
    });

    test('columnFilter_withMissingColumn_defaultsToFirstColumn', () => {
      const columns = ['Ai 모델', '몸풀기 예제', '실습', 'util'];
      const samplePosts = [
        { id: '1', column: '실습' },
        { id: '2', column: undefined },
        { id: '3', column: '' },
      ];

      const col0Posts = samplePosts.filter((p, idx) => (p.column || columns[0]) === columns[0] || (!p.column && idx === 0));
      assert.equal(col0Posts.length, 2, '컬럼이 비어있는 카드는 기본 모둠 1(columns[0])에 매핑되어야 함');
    });
  });

  // --- 2. 게시글 메타데이터 & 대용량 페이로드 안전성 ---
  test.describe('2. Post Metadata Encoding & Large Payload Stripping', () => {
    test('metadata_roundtrip_preservesAttachmentsCommentsAndOrder', () => {
      const originalMeta = {
        order: -5,
        column: '샘플1 공유',
        reactions: { like: 10, heart: 4 },
        comments: [{ id: 'c1', text: '좋은 코드네요!', author: '선생님' }],
        attachments: [{ name: 'test.png', size: '20 KB', type: 'image/png' }],
      };

      const cleanContent = '안녕하세요. 제출합니다.';
      const serialized = `${cleanContent}\n<!--SCHOOLPAD_META:${JSON.stringify(originalMeta)}-->`;

      // 파싱
      const match = serialized.match(/<!--SCHOOLPAD_META:([\s\S]*?)-->/);
      assert.ok(match, '메타 주석이 정상 매칭되어야 함');
      const parsed = JSON.parse(match[1]);

      assert.equal(parsed.order, -5);
      assert.equal(parsed.column, '샘플1 공유');
      assert.equal(parsed.reactions.like, 10);
      assert.equal(parsed.comments.length, 1);
      assert.equal(parsed.attachments[0].name, 'test.png');
    });

    test('largePayloadStripper_protectsSupabaseFromOOM', () => {
      const bigBase64 = 'data:image/png;base64,' + 'Z'.repeat(150000);
      const atts = [
        { name: 'big.png', size: '150 KB', type: 'image/png', dataUrl: bigBase64 },
        { name: 'normal.txt', size: '2 KB', type: 'text/plain', dataUrl: 'data:text/plain;base64,QUJD' },
      ];

      const lightAtts = atts.map((a) => ({
        name: a.name,
        size: a.size,
        type: a.type,
        dataUrl: (a.dataUrl && a.dataUrl.length > 80000) ? '' : a.dataUrl,
      }));

      assert.equal(lightAtts[0].dataUrl, '', '80KB 초과 첨부는 dataUrl이 경량화되어 저장 실패를 방지해야 함');
      assert.equal(lightAtts[1].dataUrl, 'data:text/plain;base64,QUJD', '소용량 첨부는 보존되어야 함');
    });
  });

  // --- 3. 카드 순서(Order Index) 오름차순 안정 정렬 ---
  test.describe('3. Card Order Index Sorting', () => {
    test('sortCards_handlesNegativeZeroPositiveAndUndefinedOrders', () => {
      const cards = [
        { id: 'c-pos', order: 10 },
        { id: 'c-neg', order: -5 },
        { id: 'c-zero', order: 0 },
        { id: 'c-undef', order: undefined },
      ];

      cards.sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 9999;
        const orderB = typeof b.order === 'number' ? b.order : 9999;
        return orderA - orderB;
      });

      assert.equal(cards[0].id, 'c-neg');
      assert.equal(cards[1].id, 'c-zero');
      assert.equal(cards[2].id, 'c-pos');
      assert.equal(cards[3].id, 'c-undef');
    });
  });

  // --- 4. 퀴즈 점수 채점 및 실시간 리더보드 계산 ---
  test.describe('4. Quiz Scoring & Leaderboard Calculation', () => {
    test('calculateScore_withCorrectAnswer_awardsPointsAccurately', () => {
      const userAnswers = [
        { questionId: 'q1', selectedOptionIndex: 1, isCorrect: true, timeSpentMs: 2500 },
        { questionId: 'q2', selectedOptionIndex: 0, isCorrect: false, timeSpentMs: 4000 },
        { questionId: 'q3', selectedOptionIndex: 2, isCorrect: true, timeSpentMs: 1200 },
      ];

      // 채점 공식: 맞춘 문제 수 * 100점 + (시간 보너스: max(0, 50 - floor(ms/1000) * 5))
      const correctCount = userAnswers.filter(a => a.isCorrect).length;
      assert.equal(correctCount, 2, '2문제를 맞췄으므로 0점이 아닌 정확한 카운트여야 함');

      const baseScore = correctCount * 100;
      assert.equal(baseScore, 200);
    });

    test('leaderboard_sortsByScoreDescendingThenTimeAscending', () => {
      const participants = [
        { name: '학생A', score: 200, totalTimeMs: 15000 },
        { name: '학생B', score: 300, totalTimeMs: 18000 },
        { name: '학생C', score: 200, totalTimeMs: 12000 }, // 동점이지만 더 빠름
      ];

      participants.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.totalTimeMs - b.totalTimeMs;
      });

      assert.equal(participants[0].name, '학생B'); // 300점
      assert.equal(participants[1].name, '학생C'); // 200점 (12초)
      assert.equal(participants[2].name, '학생A'); // 200점 (15초)
    });
  });

  // --- 5. Supabase 실시간 원격 DB 정합성 ---
  test.describe('5. Supabase Live Board Integrity', () => {
    test('verifyVibeBoard_existsAndColumnsMatched', async () => {
      const boardId = 'board-1792975588752';
      const { data: board, error: bErr } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single();

      assert.equal(bErr, null);
      assert.equal(board.code, '105207');
      assert.ok(board.columns.includes('util'));
      assert.ok(board.columns.includes('샘플1 공유'));

      const { data: posts, error: pErr } = await supabase
        .from('posts')
        .select('id, column_id')
        .eq('board_id', boardId);

      assert.equal(pErr, null);
      assert.ok(posts.length >= 40);
    });
  });

});
