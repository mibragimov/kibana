/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  searchAddDataActiveState,
  securityAddDataInProgressState,
} from '@kbn/guided-onboarding-plugin/public/services/api.mocks';
import { guidedSetupSavedObjectsType } from '@kbn/guided-onboarding-plugin/server/saved_objects/guided_setup';
import type { GuideState } from '@kbn/guided-onboarding';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function testGetState({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('GET /api/guided_onboarding/state', () => {
    afterEach(async () => {
      // Clean up saved objects
      await kibanaServer.savedObjects.clean({ types: [guidedSetupSavedObjectsType] });
    });

    const createGuides = async (guides: GuideState[]) => {
      for (const guide of guides) {
        await kibanaServer.savedObjects.create({
          type: guidedSetupSavedObjectsType,
          id: guide.guideId,
          overwrite: true,
          attributes: guide,
        });
      }
    };

    it('should return the state for all guides', async () => {
      await createGuides([searchAddDataActiveState, securityAddDataInProgressState]);

      const response = await supertest.get('/api/guided_onboarding/state').expect(200);
      expect(response.body.state.length).to.eql(2);
      expect(response.body).to.eql({
        state: [searchAddDataActiveState, securityAddDataInProgressState],
      });
    });

    it('should return the state for the active guide with query param `active=true`', async () => {
      await createGuides([
        searchAddDataActiveState,
        { ...securityAddDataInProgressState, isActive: false },
      ]);

      const response = await supertest
        .get('/api/guided_onboarding/state')
        .query({ active: true })
        .expect(200);
      expect(response.body).to.eql({ state: [searchAddDataActiveState] });
    });

    it('should return state from saved object if it exists', async () => {
      // Add a new state to the saved object
      await kibanaServer.savedObjects.create({
        type: guidedSetupSavedObjectsType,
        id: securityAddDataInProgressState.guideId,
        overwrite: true,
        attributes: securityAddDataInProgressState,
      });
      const response = await supertest.get('/api/guided_onboarding/state').expect(200);
      expect(response.body).to.eql({
        state: [securityAddDataInProgressState],
      });
    });

    it("should return an empty array if saved object doesn't exist", async () => {
      const response = await supertest.get('/api/guided_onboarding/state').expect(200);
      expect(response.body).to.eql({ state: [] });
    });
  });
}
