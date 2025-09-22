'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // User table indexes
    await queryInterface.addIndex('users', ['companyId', 'role'], {
      name: 'users_company_id_role_idx'
    });
    await queryInterface.addIndex('users', ['companyId', 'role', 'createdAt'], {
      name: 'users_company_id_role_created_at_idx'
    });

    // Ticket table indexes
    await queryInterface.addIndex('tickets', ['companyId', 'type'], {
      name: 'tickets_company_id_type_idx'
    });
    await queryInterface.addIndex('tickets', ['companyId', 'status'], {
      name: 'tickets_company_id_status_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('users', 'users_company_id_role_idx');
    await queryInterface.removeIndex('users', 'users_company_id_role_created_at_idx');
    await queryInterface.removeIndex('tickets', 'tickets_company_id_type_idx');
    await queryInterface.removeIndex('tickets', 'tickets_company_id_status_idx');
  }
};
