import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert/strict';
import { optimizeFrontendPrompt } from '../dist/index.js';

describe('Optimize Skill Integration Test', () => {
    it('should generate English output for new_feature', () => {
        const result = optimizeFrontendPrompt({
            userPrompt: 'Create a login page',
            taskType: 'new_feature',
            outputLanguage: 'en'
        });

        ok(result.optimizedPrompt.includes('Original Question'), 'Should contain "Original Question"');
        ok(result.optimizedPrompt.includes('New Feature Design'), 'Should contain English gate title');
        strictEqual(result.meta.taskType, 'new_feature');
        strictEqual(result.meta.outputLanguage, 'en');
    });

    it('should generate Chinese output for new_feature', () => {
        const result = optimizeFrontendPrompt({
            userPrompt: '创建登录页',
            taskType: 'new_feature',
            outputLanguage: 'zh'
        });

        ok(result.optimizedPrompt.includes('原始问题'), 'Should contain "原始问题"');
        ok(result.optimizedPrompt.includes('新功能设计方案'), 'Should contain Chinese gate title');
        strictEqual(result.meta.taskType, 'new_feature');
        strictEqual(result.meta.outputLanguage, 'zh');
    });

    it('should include clarifying questions by default', () => {
        const result = optimizeFrontendPrompt({
            userPrompt: 'Simple page',
            outputLanguage: 'en',
            mustAskClarifyingQuestions: true
        });
        
        ok(result.clarifyingQuestions.length > 0, 'Should have clarifying questions');
        ok(result.optimizedPrompt.includes('Clarifying Questions'), 'Should contain questions section');
    });

    it('should correctly handle guardrails', () => {
         const result = optimizeFrontendPrompt({
            userPrompt: 'test',
            outputLanguage: 'en'
        });
        ok(result.guardrails.length > 0);
        ok(result.optimizedPrompt.includes('Security First'), 'Should contain core guardrails'); 
    });
});
