export const openApiSpec = {
	openapi: '3.0.3',
	info: {
		title: 'Action Logger API',
		version: '1.0.0',
		description: 'OpenAPI spec for the Action Logger SvelteKit backend.'
	},
	servers: [{ url: '/' }],
	paths: {
		'/api/docs': {
			get: {
				summary: 'List public API endpoints',
				responses: {
					'200': {
						description: 'API docs payload',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/ApiDocsResponse' }
							}
						}
					}
				}
			}
		},
		'/api/openapi': {
			get: {
				summary: 'Fetch the OpenAPI document',
				responses: {
					'200': {
						description: 'OpenAPI JSON',
						content: {
							'application/json': {
								schema: { type: 'object' }
							}
						}
					},
					'500': {
						description: 'OpenAPI spec unavailable'
					}
				}
			}
		},
		'/api/tasks': {
			get: {
				summary: 'Get templates, recurring tasks, one-offs, and pillar emojis',
				responses: {
					'200': {
						description: 'Aggregated task data',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/TaskAggregateResponse' }
							}
						}
					},
					'500': { description: 'Failed to load tasks' }
				}
			}
		},
		'/api/all': {
			get: {
				summary: 'Get all task-related data in one call',
				responses: {
					'200': {
						description: 'Aggregated task data',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/TaskAggregateResponse' }
							}
						}
					},
					'500': { description: 'Failed to load data' }
				}
			}
		},
		'/api/one-offs': {
			get: {
				summary: 'List one-off tasks',
				parameters: [
					{
						name: 'date',
						in: 'query',
						required: false,
						schema: { type: 'string', format: 'date' },
						description: 'Filter by scheduled date (YYYY-MM-DD)'
					}
				],
				responses: {
					'200': {
						description: 'One-off tasks',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/OneOffListResponse' }
							}
						}
					}
				}
			},
			post: {
				summary: 'Create a one-off task',
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								required: ['task'],
								properties: {
									task: { $ref: '#/components/schemas/OneOffTaskTemplate' }
								}
							}
						}
					}
				},
				responses: {
					'200': {
						description: 'Created one-off',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['task'],
									properties: { task: { $ref: '#/components/schemas/OneOffTask' } }
								}
							}
						}
					},
					'400': { description: 'Invalid payload' }
				}
			},
			delete: {
				summary: 'Delete one-off tasks',
				parameters: [
					{
						name: 'id',
						in: 'query',
						required: false,
						schema: { type: 'integer', minimum: 1 },
						description: 'If provided, delete a single task; otherwise delete all.'
					}
				],
				responses: {
					'200': {
						description: 'Deletion result',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/DeleteResult' }
							}
						}
					},
					'400': { description: 'Invalid id' }
				}
			}
		},
		'/api/one-offs/recurring-today': {
			post: {
				summary: "Create today's one-offs from active recurring templates",
				responses: {
					'200': {
						description: 'Creation results',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/RecurringTodayResponse' }
							}
						}
					},
					'500': { description: 'Failed to create recurring tasks for today' }
				}
			}
		},
		'/api/recurring': {
			get: {
				summary: 'List recurring task templates',
				responses: {
					'200': {
						description: 'Recurring tasks',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/RecurringListResponse' }
							}
						}
					}
				}
			},
			post: {
				summary: 'Create a recurring task template',
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								required: ['task'],
								properties: {
									task: { $ref: '#/components/schemas/RecurringTaskTemplate' }
								}
							}
						}
					}
				},
				responses: {
					'200': {
						description: 'Created recurring task',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['task'],
									properties: { task: { $ref: '#/components/schemas/RecurringTask' } }
								}
							}
						}
					},
					'400': { description: 'Invalid payload' }
				}
			},
			delete: {
				summary: 'Delete recurring tasks',
				parameters: [
					{
						name: 'id',
						in: 'query',
						required: false,
						schema: { type: 'integer', minimum: 1 },
						description: 'If provided, delete a single task; otherwise delete all.'
					}
				],
				responses: {
					'200': {
						description: 'Deletion result',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/DeleteResult' }
							}
						}
					},
					'400': { description: 'Invalid id' }
				}
			}
		},
		'/api/history': {
			get: {
				summary: 'Fetch history entries',
				responses: {
					'200': {
						description: 'History list',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/HistoryListResponse' }
							}
						}
					}
				}
			},
			put: {
				summary: 'Replace all history entries',
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/HistoryWritePayload' }
						}
					}
				},
				responses: {
					'200': {
						description: 'Replace result',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/HistoryWriteResult' }
							}
						}
					}
				}
			},
			post: {
				summary: 'Append history entries',
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/HistoryWritePayload' }
						}
					}
				},
				responses: {
					'200': {
						description: 'Append result',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/HistoryWriteResult' }
							}
						}
					},
					'400': { description: 'No entries provided' }
				}
			},
			delete: {
				summary: 'Delete history entries by criteria',
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/HistoryDeletePayload' }
						}
					}
				},
				responses: {
					'200': {
						description: 'Delete result',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/HistoryDeleteResult' }
							}
						}
					},
					'400': { description: 'No delete criteria provided' }
				}
			}
		},
		'/api/history/overwrite': {
			post: {
				summary: 'Replace history with strict validation',
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								required: ['history'],
								properties: {
									history: {
										type: 'array',
										items: { $ref: '#/components/schemas/HistoryEntry' }
									}
								}
							}
						}
					}
				},
				responses: {
					'200': {
						description: 'Replace result',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/HistoryWriteResult' }
							}
						}
					},
					'400': { description: 'Invalid history payload' }
				}
			}
		},
		'/api/history.csv': {
			get: {
				summary: 'Download history as CSV',
				responses: {
					'200': {
						description: 'CSV export',
						content: {
							'text/csv': { schema: { type: 'string' } }
						}
					}
				}
			}
		},
		'/api/task-template-version': {
			get: {
				summary: 'Get task template version',
				responses: {
					'200': {
						description: 'Version payload',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/VersionResponse' }
							}
						}
					}
				}
			}
		},
		'/api/stretch-template-version': {
			get: {
				summary: 'Get stretch template version (alias)',
				responses: {
					'200': {
						description: 'Version payload',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/VersionResponse' }
							}
						}
					}
				}
			}
		},
		'/api/scheduled/seed': {
			post: {
				summary: 'Seed scheduled history for today',
				responses: {
					'200': {
						description: 'Seed result',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/SeedResult' }
							}
						}
					}
				}
			}
		}
	},
	components: {
		schemas: {
			ApiDocsResponse: {
				type: 'object',
				required: ['updatedAt', 'endpoints'],
				properties: {
					updatedAt: { type: 'string', format: 'date-time' },
					endpoints: { type: 'array', items: { type: 'object' } }
				}
			},
			TaskCategory: {
				type: 'string',
				enum: ['operational', 'retrospective', 'strategic']
			},
			WeekdayAbbrev: {
				type: 'string',
				enum: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
			},
			RecurrenceRule: {
				oneOf: [
					{
						type: 'object',
						required: ['frequency'],
						properties: { frequency: { type: 'string', enum: ['daily'] } }
					},
					{
						type: 'object',
						required: ['frequency'],
						properties: {
							frequency: { type: 'string', enum: ['weekly'] },
							days: { type: 'array', items: { $ref: '#/components/schemas/WeekdayAbbrev' } }
						}
					},
					{
						type: 'object',
						required: ['frequency'],
						properties: {
							frequency: { type: 'string', enum: ['monthly'] },
							day_of_month: { type: 'integer', minimum: 1, maximum: 31 }
						}
					},
					{
						type: 'object',
						required: ['frequency'],
						properties: {
							frequency: { type: 'string', enum: ['yearly'] },
							month: { type: 'integer', minimum: 1, maximum: 12 },
							day: { type: 'integer', minimum: 1, maximum: 31 }
						}
					}
				]
			},
			TaskTemplate: {
				type: 'object',
				required: ['name', 'defaultDurationSeconds'],
				properties: {
					name: { type: 'string' },
					id: { type: 'string' },
					pipeline: { type: 'string' },
					defaultDurationSeconds: { type: 'integer', minimum: 0 },
					subtaskLabels: { type: 'array', items: { type: 'string' } },
					pillar: { type: 'string' },
					pillarEmoji: { type: 'string' },
					priority: { type: 'integer', minimum: 0 },
					time_block: { type: 'string' },
					context: { type: 'string' },
					notes: { type: 'string' },
					type: { $ref: '#/components/schemas/TaskCategory' },
					recurrence: { $ref: '#/components/schemas/RecurrenceRule' },
					isOneOff: { type: 'boolean' },
					oneOffId: { type: 'integer' },
					dueDate: { type: 'string', format: 'date' }
				}
			},
			PillarEmojiMap: {
				type: 'object',
				additionalProperties: { type: 'string' }
			},
			RecurringTaskTemplate: {
				type: 'object',
				required: ['title', 'type', 'pipeline', 'pillar', 'recurrence'],
				properties: {
					title: { type: 'string' },
					type: { $ref: '#/components/schemas/TaskCategory' },
					pipeline: { type: 'string' },
					pillar: { type: 'string' },
					recurrence: { $ref: '#/components/schemas/RecurrenceRule' },
					time_block: { type: 'string' },
					priority: { type: 'integer', minimum: 0 },
					context: { type: 'string' },
					notes: { type: 'string' }
				}
			},
			RecurringTask: {
				allOf: [
					{ $ref: '#/components/schemas/RecurringTaskTemplate' },
					{
						type: 'object',
						required: ['id', 'created_at'],
						properties: {
							id: { type: 'integer' },
							created_at: { type: 'string', format: 'date-time' }
						}
					}
				]
			},
			OneOffTaskTemplate: {
				type: 'object',
				required: ['title', 'type', 'pipeline', 'pillar', 'scheduled_for'],
				properties: {
					title: { type: 'string' },
					type: { $ref: '#/components/schemas/TaskCategory' },
					pipeline: { type: 'string' },
					pillar: { type: 'string' },
					scheduled_for: { type: 'string', format: 'date' },
					time_block: { type: 'string' },
					priority: { type: 'integer', minimum: 0 },
					context: { type: 'string' },
					notes: { type: 'string' }
				}
			},
			OneOffTask: {
				allOf: [
					{ $ref: '#/components/schemas/OneOffTaskTemplate' },
					{
						type: 'object',
						required: ['id', 'created_at'],
						properties: {
							id: { type: 'integer' },
							created_at: { type: 'string', format: 'date-time' }
						}
					}
				]
			},
			HistoryEntry: {
				type: 'object',
				required: ['task', 'subtaskNumber', 'durationSeconds', 'timestamp'],
				properties: {
					taskId: { type: 'string', nullable: true },
					task: { type: 'string' },
					subtaskNumber: { type: 'integer' },
					durationSeconds: { type: 'integer', minimum: 0 },
					timestamp: { type: 'string', format: 'date-time' },
					status: { type: 'string', enum: ['done', 'skipped', 'in-progress', 'scheduled'] },
					occurrenceDate: { type: 'string', format: 'date' }
				}
			},
			BackendStatus: {
				type: 'object',
				required: ['sqliteAvailable'],
				properties: {
					sqliteAvailable: { type: 'boolean' },
					sqliteLoadError: {
						nullable: true,
						oneOf: [{ type: 'string' }, { type: 'object' }]
					}
				}
			},
			TaskAggregateResponse: {
				type: 'object',
				required: ['templates', 'templateVersion', 'recurringTasks', 'oneOffs', 'pillarEmojiMap'],
				properties: {
					templates: {
						type: 'array',
						items: { $ref: '#/components/schemas/TaskTemplate' }
					},
					templateVersion: { type: 'number' },
					recurringTasks: {
						type: 'array',
						items: { $ref: '#/components/schemas/RecurringTask' }
					},
					oneOffs: {
						type: 'array',
						items: { $ref: '#/components/schemas/OneOffTask' }
					},
					pillarEmojiMap: { $ref: '#/components/schemas/PillarEmojiMap' }
				}
			},
			OneOffListResponse: {
				type: 'object',
				required: ['tasks', 'backend'],
				properties: {
					tasks: { type: 'array', items: { $ref: '#/components/schemas/OneOffTask' } },
					backend: { $ref: '#/components/schemas/BackendStatus' }
				}
			},
			RecurringListResponse: {
				type: 'object',
				required: ['tasks', 'backend'],
				properties: {
					tasks: { type: 'array', items: { $ref: '#/components/schemas/RecurringTask' } },
					backend: { $ref: '#/components/schemas/BackendStatus' }
				}
			},
			HistoryListResponse: {
				type: 'object',
				required: ['history'],
				properties: {
					history: { type: 'array', items: { $ref: '#/components/schemas/HistoryEntry' } }
				}
			},
			HistoryWritePayload: {
				oneOf: [
					{
						type: 'array',
						items: { $ref: '#/components/schemas/HistoryEntry' }
					},
					{
						type: 'object',
						required: ['entries'],
						properties: {
							entries: { type: 'array', items: { $ref: '#/components/schemas/HistoryEntry' } }
						}
					}
				]
			},
			HistoryWriteResult: {
				type: 'object',
				required: ['ok', 'count'],
				properties: {
					ok: { type: 'boolean' },
					count: { type: 'integer' }
				}
			},
			HistoryDeleteCriteria: {
				type: 'object',
				properties: {
					taskId: { type: 'string' },
					task: { type: 'string' },
					subtaskNumber: { type: 'integer' },
					timestamp: { type: 'string' },
					occurrenceDate: { type: 'string' },
					status: { type: 'string' }
				}
			},
			HistoryDeletePayload: {
				oneOf: [
					{ $ref: '#/components/schemas/HistoryDeleteCriteria' },
					{
						type: 'array',
						items: { $ref: '#/components/schemas/HistoryDeleteCriteria' }
					},
					{
						type: 'object',
						properties: {
							entry: { $ref: '#/components/schemas/HistoryDeleteCriteria' },
							entries: {
								type: 'array',
								items: { $ref: '#/components/schemas/HistoryDeleteCriteria' }
							}
						}
					}
				]
			},
			HistoryDeleteResult: {
				type: 'object',
				required: ['ok', 'removed'],
				properties: {
					ok: { type: 'boolean' },
					removed: { type: 'integer' }
				}
			},
			DeleteResult: {
				type: 'object',
				required: ['ok', 'deleted'],
				properties: {
					ok: { type: 'boolean' },
					deleted: { type: 'integer' },
					mode: { type: 'string' }
				}
			},
			RecurringTodayResponse: {
				type: 'object',
				required: ['date', 'activeTemplates', 'created', 'skipped', 'tasks'],
				properties: {
					date: { type: 'string', format: 'date' },
					activeTemplates: { type: 'integer' },
					created: { type: 'integer' },
					skipped: { type: 'integer' },
					tasks: { type: 'array', items: { $ref: '#/components/schemas/OneOffTask' } }
				}
			},
			VersionResponse: {
				type: 'object',
				required: ['version'],
				properties: { version: { type: 'number' } }
			},
			SeedResult: {
				type: 'object',
				required: ['ok', 'count', 'date'],
				properties: {
					ok: { type: 'boolean' },
					count: { type: 'integer' },
					date: { type: 'string', format: 'date' }
				}
			}
		}
	}
} as const;
