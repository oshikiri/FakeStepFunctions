import { FakeStateMachine } from '../src/FakeStateMachine';

describe('FakeStateMachine.run', () => {
  const definition = {
    Comment: 'https://states-language.net/spec.html#data',
    StartAt: 'AddNumbers',
    States: {
      AddNumbers: {
        Type: 'Task',
        Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Add',
        InputPath: '$.numbers',
        ResultPath: '$.sum',
        End: true,
      },
    },
  };
  const fakeResources = {
    'arn:aws:lambda:us-east-1:123456789012:function:Add': (numbers: {
      val1: number;
      val2: number;
    }) => numbers.val1 + numbers.val2,
  };
  const fakeStateMachine = new FakeStateMachine(definition, fakeResources);

  test('should execute the state machine with fakeResource', async () => {
    const runStateResult = await fakeStateMachine.run({
      title: 'Numbers to add',
      numbers: { val1: 3, val2: 4 },
    });

    expect(runStateResult.data).toEqual({
      title: 'Numbers to add',
      numbers: { val1: 3, val2: 4 },
      sum: 7,
    });
  });
});
