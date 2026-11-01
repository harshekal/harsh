import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication, createAccount, openStore } from '../server.js';

test('server enforces citizen isolation, police review, and session security', async () => {
  const db = openStore(':memory:');
  const server = createApplication({ db });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://localhost:${server.address().port}`;
  const request = async (
    path,
    method = 'GET',
    data,
    cookie,
    customHeaders = {},
  ) => {
    const response = await fetch(`${origin}${path}`, {
      method,
      redirect: 'manual',
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        ...customHeaders,
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    return {
      status: response.status,
      headers: response.headers,
      data: response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : await response.text(),
    };
  };
  const password = 'Test-password-only-2026';
  const details = {
    caseId: 'TEST-1',
    date: '2026-01-01',
    location: 'Test location',
    category: 'theft',
    description: 'My mobile phone was stolen.',
    weapon: 'no',
    threats: 'no',
    injury: '',
  };
  try {
    assert.equal((await request('/api/cases')).status, 401);
    assert.equal((await request('/dashboard.html')).status, 302);
    assert.equal((await request('/server.js')).status, 404);
    assert.equal((await request('/data/fir.sqlite')).status, 404);
    assert.equal(
      (
        await request('/api/register', 'POST', {
          name: 'Fake Police',
          email: 'fake@test.com',
          password,
          role: 'admin',
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request(
          '/api/register',
          'POST',
          { name: 'First Citizen', email: 'first@test.com', password },
          null,
          { Origin: 'https://evil.example' },
        )
      ).status,
      403,
    );
    const first = await request('/api/register', 'POST', {
      name: 'First Citizen',
      email: ' FIRST@test.com ',
      password,
    });
    assert.equal(first.status, 201);
    assert.equal(first.data.user.role, 'citizen');
    assert.equal(first.data.user.hash, undefined);
    assert.equal(
      (
        await request('/api/register', 'POST', {
          name: 'Duplicate',
          email: 'first@test.com',
          password,
        })
      ).status,
      409,
    );
    await request('/api/register', 'POST', {
      name: 'Second Citizen',
      email: 'second@test.com',
      password,
    });
    await createAccount(
      db,
      { name: 'Police Admin', email: 'police@test.com', password },
      'admin',
    );
    const login = async (email) => {
      const result = await request('/api/login', 'POST', { email, password });
      assert.equal(result.status, 200);
      assert.match(
        result.headers.get('set-cookie'),
        /HttpOnly; SameSite=Strict/,
      );
      return result.headers.get('set-cookie').split(';')[0];
    };
    assert.equal(
      (
        await request('/api/login', 'POST', {
          email: 'first@test.com',
          password: 'wrong',
        })
      ).status,
      401,
    );
    const firstCookie = await login('first@test.com');
    const secondCookie = await login('second@test.com');
    const policeCookie = await login('police@test.com');
    assert.equal(
      (
        await request('/api/cases', 'POST', details, secondCookie, {
          'X-FIR-User': first.data.user.id,
        })
      ).status,
      401,
    );
    assert.notEqual(
      db.prepare('SELECT hash FROM users LIMIT 1').get().hash,
      password,
    );
    assert.equal(
      (await request('/api/me', 'GET', undefined, 'firCurrentUser=admin'))
        .status,
      401,
    );
    assert.equal(
      (
        await request(
          '/api/cases',
          'POST',
          { ...details, date: '2026-02-30' },
          firstCookie,
        )
      ).status,
      400,
    );
    const created = await request(
      '/api/cases',
      'POST',
      {
        ...details,
        ownerId: 'forged',
        status: 'closed',
        review: [{ note: 'forged' }],
      },
      firstCookie,
    );
    assert.equal(created.status, 201);
    const id = created.data.case.id;
    assert.equal(created.data.case.ownerId, first.data.user.id);
    assert.equal(created.data.case.status, 'submitted');
    assert.deepEqual(created.data.case.review, []);
    await request(
      '/api/cases',
      'POST',
      { ...details, caseId: 'TEST-2' },
      secondCookie,
    );
    assert.equal(
      (await request('/api/cases', 'GET', undefined, firstCookie)).data.cases
        .length,
      1,
    );
    assert.equal(
      (await request('/api/cases', 'GET', undefined, secondCookie)).data.cases
        .length,
      1,
    );
    assert.equal(
      (await request('/api/cases', 'GET', undefined, policeCookie)).data.cases
        .length,
      2,
    );
    for (const method of ['GET', 'PUT', 'DELETE']) {
      assert.equal(
        (
          await request(
            `/api/cases/${id}`,
            method,
            method === 'GET' ? undefined : { ...details, version: 1 },
            secondCookie,
          )
        ).status,
        404,
      );
    }
    assert.equal(
      (
        await request(
          `/api/cases/${id}/review`,
          'PATCH',
          { version: 1, status: 'closed', review: [] },
          firstCookie,
        )
      ).status,
      403,
    );
    const updated = await request(
      `/api/cases/${id}`,
      'PUT',
      { ...details, description: 'Updated report from its owner.', version: 1 },
      firstCookie,
    );
    assert.equal(updated.status, 200);
    assert.equal(updated.data.case.id, id);
    assert.equal(
      (
        await request(
          `/api/cases/${id}`,
          'PUT',
          { ...details, version: 1 },
          firstCookie,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await request(
          `/api/cases/${id}`,
          'PUT',
          { ...details, version: 2 },
          policeCookie,
        )
      ).status,
      403,
    );
    const review = [
      { id: 'R-THEFT', selected: true, note: 'Officer review recorded.' },
    ];
    assert.equal(
      (
        await request(
          `/api/cases/${id}/review`,
          'PATCH',
          { version: 2, status: 'under_review', review },
          policeCookie,
        )
      ).status,
      200,
    );
    assert.deepEqual(
      (await request(`/api/cases/${id}`, 'GET', undefined, firstCookie)).data
        .case.review,
      review,
    );
    assert.equal(
      (
        await request(
          `/api/cases/${id}`,
          'PUT',
          { ...details, version: 3 },
          firstCookie,
        )
      ).status,
      409,
    );
    assert.equal(
      (await request(`/api/cases/${id}`, 'DELETE', { version: 3 }, firstCookie))
        .status,
      409,
    );
    assert.equal(
      (
        await request(
          `/api/cases/${id}`,
          'DELETE',
          { version: 3 },
          policeCookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (await request(`/api/cases/${id}`, 'GET', undefined, firstCookie)).status,
      404,
    );
    assert.ok(
      db.prepare('SELECT deleted_at FROM cases WHERE id = ?').get(id)
        .deleted_at,
    );
    assert.ok(db.prepare("SELECT id FROM audit WHERE action = 'review'").get());
    assert.equal(
      (await request('/api/logout', 'POST', {}, firstCookie)).status,
      200,
    );
    assert.equal(
      (await request('/api/cases', 'GET', undefined, firstCookie)).status,
      401,
    );
    db.prepare('UPDATE sessions SET expires = 0').run();
    assert.equal(
      (await request('/api/me', 'GET', undefined, policeCookie)).status,
      401,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
