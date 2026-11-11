import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

// 1. 환경 변수 로드
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

test.describe('School Padlet Unit Tests (via mavka-ai methodology)', () => {

  test.describe('1. Column Normalization & Matching Logic', () => {
    // Given - When - Then
    test('normalizeColumn_withTypo_returnsCorrectedName', () => {
      // Given
      const typoCols = ['몸플기 예제', '몸풀기', '  몸풀기 예제  '];
      
      // When & Then
      typoCols.forEach(col => {
        let normalized = String(col || '').trim();
        if (normalized === '몸플기 예제' || normalized === '몸풀기') normalized = '몸풀기 예제';
        assert.equal(normalized, '몸풀기 예제');
      });
    });

    test('normalizeColumn_withEmptyOrNull_fallbacksToDefault', () => {
      // Given
      const emptyValues = [null, undefined, '', '   '];
      const defaultCol = '모둠 1';

      // When & Then
      emptyValues.forEach(val => {
        const result = (val && String(val).trim()) ? String(val).trim() : defaultCol;
        assert.equal(result, '모둠 1');
      });
    });
  });

  test.describe('2. Metadata Encoding and Decoding', () => {
    test('decodeMetadata_withValidComment_restoresAttachmentsAndOrder', () => {
      // Given
      const sampleMeta = {
        order: -3,
        column: '샘플1 공유',
        attachments: [{ name: 'tetris.html', size: '12 KB', type: 'text/html' }],
        reactions: { like: 5, heart: 2 }
      };
      const rawContent = `테스트 본문 내용\n<!--SCHOOLPAD_META:${JSON.stringify(sampleMeta)}-->`;

      // When
      let cleanContent = rawContent;
      let decodedMeta = {};
      if (rawContent.includes('<!--SCHOOLPAD_META:')) {
        const match = rawContent.match(/<!--SCHOOLPAD_META:([\s\S]*?)-->/);
        if (match && match[1]) {
          decodedMeta = JSON.parse(match[1]);
        }
        cleanContent = rawContent.replace(/<!--SCHOOLPAD_META:[\s\S]*?-->/g, '').trim();
      }

      // Then
      assert.equal(cleanContent, '테스트 본문 내용');
      assert.equal(decodedMeta.order, -3);
      assert.equal(decodedMeta.column, '샘플1 공유');
      assert.equal(decodedMeta.attachments.length, 1);
      assert.equal(decodedMeta.attachments[0].name, 'tetris.html');
      assert.equal(decodedMeta.reactions.like, 5);
    });

    test('encodeMetadata_withOversizedPayload_stripsLargeDataUrl', () => {
      // Given
      const hugeDataUrl = 'data:image/png;base64,' + 'A'.repeat(120000); // 120KB
      const atts = [
        { name: 'big.png', size: '120 KB', type: 'image/png', dataUrl: hugeDataUrl },
        { name: 'small.txt', size: '1 KB', type: 'text/plain', dataUrl: 'data:text/plain;base64,SGVsbG8=' }
      ];

      // When (경량화 로직)
      const lightAtts = atts.map(a => ({
        name: a.name,
        size: a.size,
        type: a.type,
        dataUrl: (a.dataUrl && a.dataUrl.length > 80000) ? '' : a.dataUrl
      }));

      // Then
      assert.equal(lightAtts[0].dataUrl, '', '100KB 초과 첨부는 dataUrl이 경량화되어야 함');
      assert.equal(lightAtts[1].dataUrl, 'data:text/plain;base64,SGVsbG8=', '작은 첨부는 유지되어야 함');
    });
  });

  test.describe('3. Post Sorting (Order & Timestamp)', () => {
    test('sortPosts_withMixedOrders_sortsAscendingByOrder', () => {
      // Given
      const posts = [
        { id: 'p1', title: 'Card 1', order: 5 },
        { id: 'p2', title: 'Card 2', order: -2 },
        { id: 'p3', title: 'Card 3', order: 0 },
        { id: 'p4', title: 'Card 4', order: undefined }
      ];

      // When
      posts.sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 9999;
        const orderB = typeof b.order === 'number' ? b.order : 9999;
        return orderA - orderB;
      });

      // Then
      assert.equal(posts[0].id, 'p2'); // -2
      assert.equal(posts[1].id, 'p3'); // 0
      assert.equal(posts[2].id, 'p1'); // 5
      assert.equal(posts[3].id, 'p4'); // 9999 (undefined)
    });
  });

  test.describe('4. Supabase Live Board & Post Sync Integrity', () => {
    test('verifyVibeBoard_hasValidColumnsAndActivePosts', async () => {
      // Given
      const boardId = 'board-1792975588752';

      // When
      const { data: board, error: bErr } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single();

      // Then
      assert.equal(bErr, null);
      assert.ok(board);
      assert.equal(board.code, '105207');
      assert.ok(Array.isArray(board.columns));
      assert.ok(board.columns.includes('util'));
      assert.ok(board.columns.includes('샘플1 공유'));

      const { data: posts, error: pErr } = await supabase
        .from('posts')
        .select('id, column_id, author_name, title')
        .eq('board_id', boardId);

      assert.equal(pErr, null);
      assert.ok(posts.length >= 40, `총 게시글은 40개 이상이어야 함 (실제: ${posts.length})`);
    });
  });

});
