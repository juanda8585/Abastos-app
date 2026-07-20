const express = require('express');
const cors = require('cors'); // 1. Import the package
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const productionRoutes = require('./routes/production');

const app = express();
const PORT = process.env.PORT || 3000;

// 2. Enable CORS globally for all incoming requests
app.use(cors({
  origin: '*', // Allows access from any machine/port (Perfect for development)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- Safe JSON Swagger Configuration ---
// --- Complete JSON Swagger Configuration ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Abastos Stock & Production API',
      version: '1.0.0',
      description: 'API documentation for managing production batches and inventory movements.',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Local Development Server',
      },
    ],
    paths: {
      '/api/production/batches': {
        get: {
          summary: 'Get all production batch headers',
          description: 'Retrieves a list of all production batches ordered by creation date.',
          responses: {
            200: {
              description: 'A list of batches',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer', example: 1 },
                        employee_name: { type: 'string', example: 'John Doe' },
                        created_at: { type: 'string', format: 'date-time', example: '2026-06-16T15:45:00.000Z' }
                      }
                    }
                  }
                }
              }
            },
            500: { description: 'Database query execution failure' }
          }
        },
        post: {
          summary: 'Create a new production batch header',
          description: 'Initializes a production batch with the responsible employee\'s name.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['employeeName'],
                  properties: {
                    employeeName: { type: 'string', example: 'John Doe' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Batch created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      batchId: { type: 'integer', example: 1 }
                    }
                  }
                }
              }
            },
            400: { description: 'Invalid input / Missing required fields' }
          }
        }
      },
      '/api/production/batches/{batchId}': {
        get: {
          summary: 'Get a single batch with all its nested items',
          description: 'Fetches details for a specific batch, nesting all child items inside an array using database aggregation.',
          parameters: [
            {
              in: 'path',
              name: 'batchId',
              required: true,
              schema: { type: 'integer' },
              description: 'The numeric ID of the production batch'
            }
          ],
          responses: {
            200: {
              description: 'Batch structure retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      batch_id: { type: 'integer', example: 1 },
                      employee_name: { type: 'string', example: 'John Doe' },
                      created_at: { type: 'string', format: 'date-time', example: '2026-06-16T15:45:00.000Z' },
                      items: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            itemId: { type: 'integer', example: 5 },
                            productId: { type: 'integer', example: 101 },
                            quantityProduced: { type: 'integer', example: 50 },
                            expirationDate: { type: 'string', format: 'date', example: '2026-12-31' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            404: { description: 'Production batch not found' },
            500: { description: 'Database execution issue' }
          }
        }
      },
      '/api/production/batches/{batchId}/details': {
        post: {
          summary: 'Submit production batch items and movements',
          description: 'Processes an array of items, creates batch details, and logs inventory transactions via a DB transaction.',
          parameters: [
            {
              in: 'path',
              name: 'batchId',
              required: true,
              schema: { type: 'integer' },
              description: 'The ID of the parent production batch'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items'],
                  properties: {
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['productId', 'quantityProduced', 'expirationDate'],
                        properties: {
                          productId: { type: 'integer', example: 101 },
                          quantityProduced: { type: 'integer', example: 50 },
                          expirationDate: { type: 'string', format: 'date', example: '2026-12-31' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Batch details and inventory entries saved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      batchId: { type: 'integer', example: 1 }
                    }
                  }
                }
              }
            },
            400: { description: 'Invalid parameters or item array' },
            500: { description: 'Transaction aborted / Database error' }
          }
        }
      },
      '/api/production/items/{itemId}': {
        put: {
          summary: 'Update attributes of a single production item',
          description: 'Modifies fields of a batch item and syncs the associated inventory entry within a database transaction.',
          parameters: [
            {
              in: 'path',
              name: 'itemId',
              required: true,
              schema: { type: 'integer' },
              description: 'The specific item row identifier'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    quantityProduced: { type: 'integer', example: 75 },
                    expirationDate: { type: 'string', format: 'date', example: '2027-01-15' }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Item and movement updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      itemId: { type: 'integer', example: 5 },
                      updatedValues: {
                        type: 'object',
                        properties: {
                          batch_id: { type: 'integer', example: 1 },
                          product_id: { type: 'integer', example: 101 },
                          quantity_produced: { type: 'integer', example: 75 }
                        }
                      }
                    }
                  }
                }
              }
            },
            400: { description: 'Missing items or invalid body values' },
            404: { description: 'Batch item row not found' }
          }
        },
        delete: {
          summary: 'Delete a single item from a batch',
          description: 'Removes the batch item record and deletes its corresponding ledger footprint inside inventory_movements via an atomic transaction.',
          parameters: [
            {
              in: 'path',
              name: 'itemId',
              required: true,
              schema: { type: 'integer' },
              description: 'The specific item row identifier to delete'
            }
          ],
          responses: {
            200: {
              description: 'Item and linked inventory entries successfully cleared',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Item 5 and linked inventory cleared.' }
                    }
                  }
                }
              }
            },
            404: { description: 'Target batch item row not found' },
            500: { description: 'Transaction execution failure' }
          }
        }
      }
    }
  },
  apis: []
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
// ---------------------------------------

app.use(express.json());
app.use('/api', productionRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger available at http://localhost:${PORT}/api-docs`);
});