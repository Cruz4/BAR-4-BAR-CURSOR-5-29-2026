import assert from 'node:assert/strict';
import { nextSupportRelationship } from '../src/lib/relationships';
import {
  isServerOnlyActivityType,
  type ActivityType,
} from '../src/lib/activity/types';

assert.deepEqual(nextSupportRelationship(null, 'follow'), { exists: true, innerCircle: false });
assert.deepEqual(nextSupportRelationship(null, 'inner_circle_on'), { exists: true, innerCircle: true });
assert.deepEqual(nextSupportRelationship(true, 'inner_circle_off'), { exists: true, innerCircle: false });
assert.deepEqual(nextSupportRelationship(false, 'unfollow'), { exists: false, innerCircle: false });
assert.deepEqual(nextSupportRelationship(null, 'inner_circle_off'), { exists: false, innerCircle: false });

for (const type of ['profile_followed', 'inner_circle_joined'] as ActivityType[]) {
  assert.equal(isServerOnlyActivityType(type), true, `${type} must not be client-mintable`);
}

console.log('Support relationship verification passed.');
