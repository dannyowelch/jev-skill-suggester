'use client';

import { useState, useEffect } from 'react';
import type { Skill, WideRankResult, RerankResult, TypeSafeRequest, TypeSafeResponse, ChoiceAnswer, NoulAnswer } from './types';

const DEFAULT_SKILLS: Skill[] = [
  {
    name: 'pptx-author',
    shortDescription: 'Create and edit PowerPoint presentations',
    fullDescription: 'Create, edit, and format PowerPoint presentations with slides, text, images, and layouts',
    excerpt: 'Generates .pptx files with python-pptx. Supports themes, bullet points, images, charts.'
  },
  {
    name: 'powerpoint-designer',
    shortDescription: 'Design PowerPoint slide decks',
    fullDescription: 'Design professional PowerPoint slide decks with custom layouts and branding',
    excerpt: 'Alternative PowerPoint tool focusing on visual design and brand consistency.'
  },
  {
    name: 'pitch-deck-builder',
    shortDescription: 'Build investor pitch decks',
    fullDescription: 'Create investor-ready pitch decks with standard sections (problem, solution, market)',
    excerpt: 'Specialized for startup pitch decks. Includes templates for VCs and accelerators.'
  },
  {
    name: 'apple-notes',
    shortDescription: 'Create and manage Apple Notes',
    fullDescription: 'Access and manage the user\'s Apple Notes via local SQLite database',
    excerpt: 'Reads and writes ~/Library/Group Containers/.../NoteStore.sqlite. macOS only.'
  },
  {
    name: 'x-post',
    shortDescription: 'Post and read X (Twitter) content',
    fullDescription: 'Post tweets, threads, read timelines, search X content via authenticated API',
    excerpt: 'Uses X API v2. Requires OAuth. Can post, reply, search, and fetch user timelines.'
  },
  {
    name: 'web-search',
    shortDescription: 'Search the web for current information',
    fullDescription: 'Search Google, Bing, or DuckDuckGo for current information not in training data',
    excerpt: 'Returns snippets and URLs. Use for recent events, documentation, or unknown facts.'
  },
  {
    name: 'git-pr',
    shortDescription: 'Create and manage GitHub pull requests',
    fullDescription: 'Create, update, and manage GitHub pull requests with reviews and comments',
    excerpt: 'Uses gh CLI or GitHub API. Can create PRs, add reviewers, and check CI status.'
  },
  {
    name: 'gmail-sender',
    shortDescription: 'Send and manage Gmail messages',
    fullDescription: 'Send emails, create drafts, and search Gmail via Google API',
    excerpt: 'OAuth Gmail API client. Can send, draft, search, label, and archive messages.'
  },
  {
    name: 'calendar-schedule',
    shortDescription: 'Manage calendar events and scheduling',
    fullDescription: 'Create, update, and search Google Calendar events with attendees',
    excerpt: 'Google Calendar API. Create events, find free slots, send invites.'
  },
  {
    name: 'slack-messenger',
    shortDescription: 'Send Slack messages and read channels',
    fullDescription: 'Post messages, read channels, and search Slack history via API',
    excerpt: 'Slack Web API client. Can post, upload files, search, and read channel history.'
  },
  {
    name: 'database-query',
    shortDescription: 'Query SQL and NoSQL databases',
    fullDescription: 'Connect to and query PostgreSQL, MySQL, MongoDB, and other databases',
    excerpt: 'Generic database client. Supports multiple SQL and NoSQL backends via connection strings.'
  },
  {
    name: 'pdf-generator',
    shortDescription: 'Create PDF documents',
    fullDescription: 'Generate PDF documents from markdown, HTML, or custom layouts',
    excerpt: 'Uses pdfkit or similar. Can render markdown to PDF with custom styling.'
  },
  {
    name: 'excel-analyzer',
    shortDescription: 'Read and analyze Excel spreadsheets',
    fullDescription: 'Parse Excel files, run calculations, and generate reports from spreadsheet data',
    excerpt: 'Reads .xlsx files with openpyxl. Can extract data, pivot tables, and chart info.'
  },
  {
    name: 'docker-manager',
    shortDescription: 'Manage Docker containers and images',
    fullDescription: 'Start, stop, build, and manage Docker containers and compose setups',
    excerpt: 'Docker CLI wrapper. Can build images, run containers, and manage networks.'
  },
  {
    name: 'linear-issues',
    shortDescription: 'Create and manage Linear issues',
    fullDescription: 'Create, update, search, and manage Linear issues and projects via API',
    excerpt: 'Linear GraphQL API client. Can create issues, update status, assign, and search.'
  },
  {
    name: 'figma-export',
    shortDescription: 'Export Figma designs and assets',
    fullDescription: 'Access Figma files and export designs, assets, and specifications',
    excerpt: 'Figma REST API. Can fetch designs, export images, and read component specs.'
  },
];

const SAMPLE_REQUESTS = [
  {
    label: 'Clear match (web search)',
    text: 'What are the latest updates in the Next.js 15 release notes?'
  },
  {
    label: 'Ambiguous (PowerPoint vs pitch deck)',
    text: 'I need to create a slide deck for my startup\'s Series A fundraising'
  },
  {
    label: 'No skill fits',
    text: 'Explain the difference between map and flatMap in JavaScript'
  },
  {
    label: 'Action required (Gmail)',
    text: 'Send an email to the team about tomorrow\'s standup being moved to 11am'
  },
];

const GATE_THRESHOLD = 0.30;
const FIT_THRESHOLD = 0.30;

export default function Home() {
  const [request, setRequest] = useState('');
  const [skills, setSkills] = useState<Skill[]>(DEFAULT_SKILLS);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [wideRankResult, setWideRankResult] = useState<WideRankResult | null>(null);
  const [rerankResult, setRerankResult] = useState<RerankResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('typesafe_api_key');
    if (stored) setApiKey(stored);
  }, []);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    localStorage.setItem('typesafe_api_key', value);
  };

  const callTypeSafe = async (payload: TypeSafeRequest): Promise<TypeSafeResponse> => {
    const response = await fetch('/api/typesafe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TypeSafe-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'TypeSafe API call failed');
    }

    return response.json();
  };

  const runSuggestion = async () => {
    if (!request.trim()) {
      setError('Please enter a request');
      return;
    }

    setLoading(true);
    setError(null);
    setWideRankResult(null);
    setRerankResult(null);

    try {
      const wideRankPayload: TypeSafeRequest = {
        state: {
          request: request.trim(),
          recent_context: '',
        },
        model: 'jev-latest',
        questions: {
          which: {
            type: 'choice',
            instructions: 'Which skill, if any, is right to load for the user\'s latest request?',
            criteria: Object.fromEntries(
              skills.map(s => [s.name, s.shortDescription])
            ),
          },
          'gate::acts_on_user_system': {
            type: 'noul',
            instructions: 'Is the assistant being asked to act on the user\'s files, accounts, devices, or online services, rather than only to explain or advise?',
          },
          'gate::would_follow_documented_procedure': {
            type: 'noul',
            instructions: 'Would a careful expert answering this consult a specific documented procedure or set of commands, rather than answering from general understanding?',
          },
          'gate::prose_suffices': {
            type: 'noul',
            instructions: 'Could a knowledgeable generalist fully satisfy this request in prose, with no tools, no documentation, and no access to the user\'s files or accounts?',
          },
        },
      };

      const wideRankResponse = await callTypeSafe(wideRankPayload);
      
      const choiceAnswer = wideRankResponse.answers.which as ChoiceAnswer;
      const actsOnSystem = (wideRankResponse.answers['gate::acts_on_user_system'] as NoulAnswer).noul;
      const wouldFollowProcedure = (wideRankResponse.answers['gate::would_follow_documented_procedure'] as NoulAnswer).noul;
      const proseSuffices = (wideRankResponse.answers['gate::prose_suffices'] as NoulAnswer).noul;
      
      const gateScore = (actsOnSystem + wouldFollowProcedure + (1 - proseSuffices)) / 3;
      
      const rankedProbabilities = Object.entries(choiceAnswer.probabilities)
        .map(([name, probability]) => ({ name, probability }))
        .sort((a, b) => b.probability - a.probability);

      const wideResult: WideRankResult = {
        gateScore,
        rankedProbabilities,
        choice: choiceAnswer.choice,
        raw: wideRankResponse,
      };

      setWideRankResult(wideResult);

      if (gateScore < GATE_THRESHOLD) {
        setRerankResult({
          fits: {},
          winner: null,
          reason: `Gate score ${gateScore.toFixed(3)} below threshold ${GATE_THRESHOLD}`,
          raw: wideRankResponse,
        });
        return;
      }

      const topThree = rankedProbabilities.slice(0, 3).map(p => p.name);
      const shortlistSkills = skills.filter(s => topThree.includes(s.name));

      if (shortlistSkills.length === 0) {
        setRerankResult({
          fits: {},
          winner: null,
          reason: 'No skills in shortlist',
          raw: wideRankResponse,
        });
        return;
      }

      const rerankPayload: TypeSafeRequest = {
        state: {
          request: request.trim(),
          recent_context: '',
        },
        model: 'jev-latest',
        questions: {
          which: {
            type: 'choice',
            instructions: 'Which skill best fits the user\'s request?',
            criteria: Object.fromEntries(
              shortlistSkills.map(s => [s.name, `${s.fullDescription}\n\n${s.excerpt}`])
            ),
          },
          ...Object.fromEntries(
            shortlistSkills.map(s => [
              `fit::${s.name}`,
              {
                type: 'noul',
                instructions: `Does the "${s.name}" skill genuinely fit this request, or would using it be a stretch?`,
              },
            ])
          ),
        },
      };

      const rerankResponse = await callTypeSafe(rerankPayload);
      
      const rerankChoice = (rerankResponse.answers.which as ChoiceAnswer).choice;
      const fits: Record<string, number> = {};
      
      for (const skill of shortlistSkills) {
        const fitAnswer = rerankResponse.answers[`fit::${skill.name}`] as NoulAnswer;
        fits[skill.name] = fitAnswer.noul;
      }

      const bestFit = fits[rerankChoice];
      const winner = bestFit >= FIT_THRESHOLD ? rerankChoice : null;

      setRerankResult({
        fits,
        winner,
        reason: winner
          ? `Best fit ${rerankChoice} (${bestFit.toFixed(3)}) above threshold`
          : `Best fit ${rerankChoice} (${bestFit.toFixed(3)}) below threshold ${FIT_THRESHOLD}`,
        raw: rerankResponse,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    setSkills([
      ...skills,
      {
        name: 'new-skill',
        shortDescription: 'Description',
        fullDescription: 'Full description',
        excerpt: 'Example excerpt',
      },
    ]);
  };

  const updateSkill = (index: number, field: keyof Skill, value: string) => {
    const updated = [...skills];
    updated[index] = { ...updated[index], [field]: value };
    setSkills(updated);
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Jev Skill Suggester
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Two-stage skill ranking: wide Choice over roster + Noul gate, then shortlist rerank with fit Nouls
          </p>
          <div className="mt-4 flex gap-2 text-sm">
            <a
              href="https://x.com/dani_avila7/status/2101885477158547753"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              X Bookmark
            </a>
            <span className="text-gray-400">•</span>
            <a
              href="https://docs.typesafe.ai/cookbooks/skill_suggestion.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              TypeSafe Cookbook
            </a>
          </div>
        </header>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              TypeSafe API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Stored in localStorage. Falls back to TYPESAFE_API_KEY env var.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              User Request
            </label>
            <textarea
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              rows={3}
              placeholder="Enter a user request..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <div className="mt-3 flex flex-wrap gap-2">
              {SAMPLE_REQUESTS.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => setRequest(sample.text)}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {sample.label}
                </button>
              ))}
            </div>

            <button
              onClick={runSuggestion}
              disabled={loading}
              className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Running...' : 'Run Suggestion'}
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Skill Roster ({skills.length})
              </h2>
              <button
                onClick={addSkill}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add Skill
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {skills.map((skill, idx) => (
                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={skill.name}
                      onChange={(e) => updateSkill(idx, 'name', e.target.value)}
                      placeholder="skill-name"
                      className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <input
                      type="text"
                      value={skill.shortDescription}
                      onChange={(e) => updateSkill(idx, 'shortDescription', e.target.value)}
                      placeholder="Short description"
                      className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <button
                    onClick={() => removeSkill(idx)}
                    className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 font-medium">Error</p>
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {wideRankResult && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Call 1: Wide Rank
              </h2>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gate Score: <span className={`font-mono font-semibold ${wideRankResult.gateScore >= GATE_THRESHOLD ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {wideRankResult.gateScore.toFixed(3)}
                  </span>
                  {wideRankResult.gateScore >= GATE_THRESHOLD ? ' ✓ above threshold' : ' ✗ below threshold'}
                </p>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ranked Probabilities (Top 10)
                </h3>
                <div className="space-y-1">
                  {wideRankResult.rankedProbabilities.slice(0, 10).map(({ name, probability }) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-600 dark:text-gray-400 w-32 truncate">
                        {name}
                      </span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full"
                          style={{ width: `${probability * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-gray-600 dark:text-gray-400 w-12 text-right">
                        {(probability * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {wideRankResult.raw.usage && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tokens: {wideRankResult.raw.usage.input_tokens || 0} in / {wideRankResult.raw.usage.output_tokens || 0} out
                  {wideRankResult.raw.timing_ms && ` • ${wideRankResult.raw.timing_ms}ms`}
                </p>
              )}
            </div>
          )}

          {rerankResult && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Call 2: Shortlist Rerank
              </h2>

              {Object.keys(rerankResult.fits).length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fit Scores
                  </h3>
                  <div className="space-y-1">
                    {Object.entries(rerankResult.fits).map(([name, fit]) => (
                      <div key={name} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-600 dark:text-gray-400 w-32 truncate">
                          {name}
                        </span>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                          <div
                            className={`h-full ${fit >= FIT_THRESHOLD ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${fit * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-gray-600 dark:text-gray-400 w-12 text-right">
                          {fit.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Winner: <span className={`font-mono font-semibold ${rerankResult.winner ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {rerankResult.winner || 'none'}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {rerankResult.reason}
                </p>
              </div>

              {rerankResult.raw.usage && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tokens: {rerankResult.raw.usage.input_tokens || 0} in / {rerankResult.raw.usage.output_tokens || 0} out
                  {rerankResult.raw.timing_ms && ` • ${rerankResult.raw.timing_ms}ms`}
                </p>
              )}
            </div>
          )}

          {rerankResult?.winner && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
                Suggested Skill Injection
              </h2>
              <pre className="text-xs bg-white dark:bg-gray-900 p-4 rounded border border-green-200 dark:border-green-700 overflow-x-auto">
                <code>{`<skill_relevance>
The "${rerankResult.winner}" skill is relevant to this request.

${skills.find(s => s.name === rerankResult.winner)?.fullDescription}

You should read and follow the skill documentation for "${rerankResult.winner}" to handle this request.
</skill_relevance>`}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
