import { callAgent } from '../../../lib/agent';

function normalizeMetric(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : null;
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const targetWord = typeof body?.targetWord === 'string' ? body.targetWord.trim().slice(0, 100) : '';
        const azureResponse = body?.azureResponse;
        const best = azureResponse?.NBest?.[0];
        const assessment = best?.PronunciationAssessment;

        if (!targetWord || !assessment || typeof assessment !== 'object' || normalizeMetric(assessment.AccuracyScore) === null) {
            return Response.json({ ok: false, message: 'Thiếu kết quả chấm phát âm.' }, { status: 400 });
        }

        const evidence = {
            recognizedText: typeof best?.Display === 'string' ? best.Display.slice(0, 200) : '',
            accuracyScore: normalizeMetric(assessment.AccuracyScore),
            fluencyScore: normalizeMetric(assessment.FluencyScore),
            completenessScore: normalizeMetric(assessment.CompletenessScore),
            words: (Array.isArray(best?.Words) ? best.Words : []).slice(0, 8).map((entry: any) => ({
                word: typeof entry?.Word === 'string' ? entry.Word.slice(0, 50) : '',
                accuracyScore: normalizeMetric(entry?.PronunciationAssessment?.AccuracyScore),
                errorType: typeof entry?.PronunciationAssessment?.ErrorType === 'string'
                    ? entry.PronunciationAssessment.ErrorType.slice(0, 40)
                    : '',
                phonemes: (Array.isArray(entry?.Phonemes) ? entry.Phonemes : []).slice(0, 12).map((phoneme: any) => ({
                    phoneme: typeof phoneme?.Phoneme === 'string' ? phoneme.Phoneme.slice(0, 20) : '',
                    accuracyScore: normalizeMetric(phoneme?.PronunciationAssessment?.AccuracyScore),
                    errorType: typeof phoneme?.PronunciationAssessment?.ErrorType === 'string'
                        ? phoneme.PronunciationAssessment.ErrorType.slice(0, 40)
                        : '',
                })),
            })),
        };

        const result = await callAgent({
            messages: [
                {
                    role: 'system',
                    content: 'Bạn là Bạn Sóc, trợ lý luyện phát âm tiếng Anh cho trẻ nhỏ Việt Nam. Dựa đúng vào từ mục tiêu và dữ liệu Azure Speech được cung cấp, hãy nói một lời khuyên ngắn bằng tiếng Việt (1-2 câu), nhẹ nhàng, khích lệ và có một cách luyện cụ thể. Nếu có âm vị bị sai hoặc điểm thấp, hướng dẫn bé tập đúng âm đó đơn giản; nếu điểm cao, khen và gợi ý duy trì. Không bịa dữ liệu, không lặp lại điểm số, không phê bình hay làm bé lo lắng.',
                },
                {
                    role: 'user',
                    content: JSON.stringify({ targetWord, azurePronunciationAssessment: evidence }),
                },
            ],
            temperature: 0.5,
            maxTokens: 12000,
            timeoutMs: 15_000,
        });

        return Response.json({ ok: true, text: result.text });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Không thể tạo lời khuyên phát âm.';
        return Response.json({ ok: false, message }, { status: 503 });
    }
}