const express = require('express');
const cors = require('cors'); // 1. Import the package
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const productionRoutes = require('./routes/production');
const salesRoutes = require('./routes/sales');
const customerRoutes = require('./routes/customers');
const employeeRoutes = require('./routes/employees');

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
      '/api/batches': {
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
                        employees: {
                          type: 'array',
                          description: 'Employees who worked on this batch (at least one)',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'integer', example: 3 },
                              name: { type: 'string', example: 'Yanira' }
                            }
                          }
                        },
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
                  required: ['employeeIds'],
                  properties: {
                    employeeIds: {
                      type: 'array',
                      minItems: 1,
                      description: 'Roster ids of every employee working on this batch',
                      items: { type: 'integer', example: 3 }
                    },
                    employeeName: {
                      type: 'string',
                      deprecated: true,
                      description: 'Legacy single-name form; resolved against the roster. Prefer employeeIds.',
                      example: 'Yanira'
                    }
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
            400: { description: 'Invalid input / Missing required fields' },
            404: { description: 'Legacy employeeName is not in the roster' }
          }
        }
      },
      '/api/batches/{batchId}': {
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
                      employees: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'integer', example: 3 },
                            name: { type: 'string', example: 'Yanira' }
                          }
                        }
                      },
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
      '/api/batches/{batchId}/details': {
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
      '/api/items/{itemId}': {
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
      },
      '/api/employees': {
        get: {
          summary: 'Get the employee roster',
          description: 'All employees who can be assigned to a production batch, ordered by name.',
          responses: {
            200: {
              description: 'The roster',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer', example: 3 },
                        name: { type: 'string', example: 'Yanira' }
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
          summary: 'Add an employee to the roster',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string', maxLength: 100, example: 'Bibiana' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Employee created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer', example: 7 },
                      name: { type: 'string', example: 'Bibiana' }
                    }
                  }
                }
              }
            },
            400: { description: 'Missing or too long a name' },
            409: { description: 'Employee already in the roster' }
          }
        }
      },
      '/api/sales': {
        get: {
          summary: 'Get sales history (paginated)',
          description: 'Returns sales newest first, each with its aggregated line items and total amount.',
          parameters: [
            {
              in: 'query',
              name: 'limit',
              schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
              description: 'Page size'
            },
            {
              in: 'query',
              name: 'offset',
              schema: { type: 'integer', minimum: 0, default: 0 },
              description: 'Number of rows to skip'
            }
          ],
          responses: {
            200: {
              description: 'A list of sales',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Sale' }
                  }
                }
              }
            },
            400: { description: 'Invalid limit or offset' },
            500: { description: 'Database query execution failure' }
          }
        },
        post: {
          summary: 'Create a sale and deduct stock',
          description: 'Validated line items are checked against available stock (aggregated per product) and written in a single transaction together with the inventory movements.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['customer_id', 'employee_name', 'items'],
                  properties: {
                    customer_id: { type: 'integer', example: 1 },
                    employee_name: { type: 'string', maxLength: 100, example: 'Yanira' },
                    items: {
                      type: 'array',
                      minItems: 1,
                      items: {
                        type: 'object',
                        required: ['product_id', 'quantity_sold', 'unit_price'],
                        properties: {
                          product_id: { type: 'integer', example: 1 },
                          quantity_sold: { type: 'number', exclusiveMinimum: 0, example: 5 },
                          unit_price: { type: 'number', minimum: 0, example: 6500 }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Sale created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer', example: 10 },
                      customer_id: { type: 'integer', example: 1 },
                      employee_name: { type: 'string', example: 'Yanira' },
                      status: { type: 'string', example: 'paid' },
                      items: { type: 'array', items: { type: 'object' } }
                    }
                  }
                }
              }
            },
            400: { description: 'Invalid payload (missing or malformed fields)' },
            404: { description: 'Customer not found' },
            409: { description: 'Insufficient stock for one or more products' },
            500: { description: 'Transaction aborted / Database error' }
          }
        }
      },
      '/api/sales/{id}': {
        get: {
          summary: 'Get a single sale with its line items',
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'integer' },
              description: 'The numeric ID of the sale'
            }
          ],
          responses: {
            200: {
              description: 'Sale retrieved',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Sale' }
                }
              }
            },
            400: { description: 'Invalid sale ID parameter' },
            404: { description: 'Sale not found' },
            500: { description: 'Database query execution failure' }
          }
        }
      },
      '/api/sales/{id}/refund': {
        post: {
          summary: 'Refund a sale and restore stock',
          description: 'Marks the sale as refunded and returns every line item quantity to stock. Refunding an already refunded sale returns 409.',
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'integer' },
              description: 'The numeric ID of the sale to refund'
            }
          ],
          responses: {
            200: {
              description: 'Sale refunded',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer', example: 10 },
                      customer_id: { type: 'integer', example: 1 },
                      status: { type: 'string', example: 'refunded' },
                      sale_date: { type: 'string', format: 'date' }
                    }
                  }
                }
              }
            },
            400: { description: 'Invalid sale ID parameter' },
            404: { description: 'Sale not found' },
            409: { description: 'Sale already refunded or cancelled' },
            500: { description: 'Transaction aborted / Database error' }
          }
        }
      },
      '/api/customers/active': {
        get: {
          summary: 'Get active customers',
          description: 'Returns the customers available in the POS dropdown, ordered by company name.',
          responses: {
            200: {
              description: 'A list of active customers',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer', example: 1 },
                        company_name: { type: 'string', example: 'Apex Logistics Solutions' },
                        contact_name: { type: 'string', example: 'Sarah Jenkins' },
                        phone: { type: 'string', example: '+1 (555) 019-2834' },
                        email: { type: 'string', example: 's.jenkins@apexlogistics.com' },
                        delivery_address: { type: 'string' }
                      }
                    }
                  }
                }
              }
            },
            500: { description: 'Database query execution failure' }
          }
        }
      }
    },
    components: {
      schemas: {
        Sale: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 10 },
            customer_id: { type: 'integer', example: 1 },
            company_name: { type: 'string', example: 'Apex Logistics Solutions' },
            contact_name: { type: 'string', example: 'Sarah Jenkins' },
            employee_name: { type: 'string', example: 'Yanira' },
            status: { type: 'string', enum: ['created', 'pending', 'paid', 'cancelled', 'refunded'], example: 'paid' },
            sale_date: { type: 'string', format: 'date' },
            created_at: { type: 'string', format: 'date-time' },
            total_amount: { type: 'number', example: 32500 },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  item_id: { type: 'integer', example: 3 },
                  product_id: { type: 'integer', example: 1 },
                  product_name: { type: 'string', example: 'Pulpa de Mango' },
                  quantity_sold: { type: 'number', example: 5 },
                  unit_price: { type: 'number', example: 6500 },
                  subtotal: { type: 'number', example: 32500 }
                }
              }
            }
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
app.use('/api', salesRoutes);
app.use('/api', customerRoutes);
app.use('/api', employeeRoutes);

// Global Error Handler
// Errors carrying a `statusCode` (see src/utils/httpError.js) are reported as
// client errors (4xx) with their message; everything else is a generic 500 so
// database internals never leak to the client.
app.use((err, req, res, next) => {
  const statusCode = Number(err.statusCode || err.status) || 500;

  if (statusCode >= 500) {
    console.error('Unhandled Error:', err.stack);
  }

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : (err.message || 'Request failed')
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger available at http://localhost:${PORT}/api-docs`);
});