/* eslint-env mocha */

'use strict';

const expect = require('chai').expect;
const FakeStateMachine = require('../FakeStateMachine').FakeStateMachine;
const RunStateResult = require('../RunStateResult').RunStateResult;

describe('FakeStateMachine', () => {
  describe('#run()', () => {
    context('when StartAt field does not exist', () => {
      it('should throw an Error', () => {
        const definition = {
          States: {
            Done: {
              Type: 'Succeed'
            }
          }
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});
        expect(() => fakeStateMachine.run({}))
          .to.throw(Error, 'StartAt does not exist');
      });
    });

    it('should pass the input to fakeResource and fill the result to ResultPath', () => {
      const definition = {
        StartAt: 'Add',
        States: {
          Add: {
            Type: 'Task',
            Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Add',
            InputPath: '$.numbers',
            ResultPath: '$.sum',
            End: true
          }
        }
      };
      const fakeResources = {
        'arn:aws:lambda:us-east-1:123456789012:function:Add': numbers => numbers.val1 + numbers.val2,
      };
      const fakeStateMachine = new FakeStateMachine(definition, fakeResources);

      expect(fakeStateMachine.run({
        title: 'Numbers to add',
        numbers: { val1: 3, val2: 4 }
      })).to.deep.equal(new RunStateResult({
        title: 'Numbers to add',
        numbers: { val1: 3, val2: 4 },
        sum: 7
      }, 'Task', null, true));
    });

    context('when there is invalid Type String', () => {
      it('should throw an Error', () => {
        const definition = {
          StartAt: 'Done',
          States: {
            Done: {
              Type: 'UnknownType'
            }
          }
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});

        expect(() => fakeStateMachine.run({}))
          .to.throw(Error, 'Invalid Type: UnknownType');
      });
    });
    context('when the state machine calls the same task twice', () => {
      it('should return the result successfully');
    });

    context('when state machine contains a loop with break', () => {
      it('should return the result successfully');
    });
  });

  describe('#runState()', () => {
    context('when the state has `"End": true`', () => {
      it('should be marked as a terminal state', () => {
        const definition = {
          StartAt: 'Start',
          States: {
            Target: {
              Input: 'a',
              ResultPath: '$.a2',
              Type: 'Pass',
              End: true
            }
          }
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});
        expect(
          fakeStateMachine.runState('Target', {
            a1: 123
          }).isTerminalState
        ).to.be.true;
      });
    });

    context('when the state contains "Next" field', () => {
      it('should return the state with results and "Next" destination', () => {
        const definition = {
          StartAt: 'Start',
          States: {
            Target: {
              Input: 'a',
              ResultPath: '$.a2',
              Type: 'Pass',
              Next: 'NextState'
            }
          }
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});
        expect(
          fakeStateMachine.runState('Target', {
            a1: 123
          }).nextStateName
        ).to.equal('NextState');
      });
    });

    context('when the state does not contain "Next" field and does not have `"End": true`', () => {
      it('should throw an error', () => {
        const definition = {
          StartAt: 'Start',
          States: {
            Target: {
              Input: 'a',
              ResultPath: '$.a2',
              Type: 'Pass'
            }
          }
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});
        expect(() => fakeStateMachine.runState('Target', {
          a1: 123
        })).to.throw(Error, 'nextState must be non-null when the state is non-terminal state');
      });
    });

    context('when the state has `"Type": "Succeed"`', () => {
      it('should not change the state and return it', () => {
        const definition = {
          StartAt: 'Start',
          States: {
            Target: {
              Type: 'Succeed'
            }
          }
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});

        expect(
          fakeStateMachine.runState('Target', { sum: 7 })
        ).to.deep.equal(new RunStateResult({ sum: 7 }, 'Succeed', null, true));
      });
    });
    context('when the state has `"Type": "Fail"`', () => {
      it('should not change the state and return it', () => {
        const definition = {
          StartAt: 'Start',
          States: {
            Target: {
              Type: 'Fail'
            }
          }
        };
        const fakeStateMachine = new FakeStateMachine(definition, {});

        expect(
          fakeStateMachine.runState('Target', { sum: 7 })
        ).to.deep.equal(new RunStateResult({ sum: 7 }, 'Fail', null, true));
      });
    });
    context('when the state has `"Type": "Choice"`', () => {
      it('should select expected state as a next state');
    });

    context('when the state has `"Type": "Pass"`', () => {
      context('when there is an Input field', () => {
        it('should fill outputPath using Input field', () => {
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                Input: 'a',
                ResultPath: '$.a2',
                Type: 'Pass',
                Next: 'NextState'
              }
            }
          };
          const fakeStateMachine = new FakeStateMachine(definition, {});
          expect(
            fakeStateMachine.runState('Target', {
              a1: 123
            })
          ).to.deep.equal(new RunStateResult({
            a1: 123,
            a2: 'a'
          }, 'Pass', 'NextState', false));
        });
      });
      context('when the state has an InputPath field', () => {
        context('when the InputPath is undefined', () => {
          it('should fill outputPath using the whole data ($)');
        });
        context('when the InputPath is null', () => {
          it('should fill outputPath using {}', () => {
            const definition = {
              StartAt: 'Start',
              States: {
                Target: {
                  InputPath: null,
                  ResultPath: '$.a2',
                  Type: 'Pass',
                  Next: 'NextState'
                }
              }
            };
            const fakeStateMachine = new FakeStateMachine(definition, {});
            expect(
              fakeStateMachine.runState('Target', {
                a1: 123
              })
            ).to.deep.equal(new RunStateResult({
              a1: 123,
              a2: {}
            }, 'Pass', 'NextState', false));
          });
        });
        context('when the InputPath is non-null', () => {
          it('should fill outputPath using InputPath field', () => {
            const definition = {
              StartAt: 'Start',
              States: {
                Target: {
                  InputPath: '$.a1',
                  ResultPath: '$.a2',
                  Type: 'Pass',
                  Next: 'NextState'
                }
              }
            };
            const fakeStateMachine = new FakeStateMachine(definition, {});
            expect(
              fakeStateMachine.runState('Target', {
                a1: 123
              })
            ).to.deep.equal(new RunStateResult({
              a1: 123,
              a2: 123
            }, 'Pass', 'NextState', false));
          });
        });
      });
      context('when the InputPath points a path like $.a.b3.c2', () => {
        it('should parse the InputPath correctly', () => {
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                InputPath: '$.a.b2.c1',
                ResultPath: '$.a.b3.c2',
                Type: 'Pass',
                Next: 'NextState'
              }
            }
          };
          const fakeStateMachine = new FakeStateMachine(definition, {});
          expect(
            fakeStateMachine.runState('Target', {
              a: {
                b1: 'a-b1',
                b2: { c1: 'a-b2-c1' },
                b3: { c1: 'a-b3-c1' }
              }
            })
          ).to.deep.equal(new RunStateResult({
            a: {
              b1: 'a-b1',
              b2: { c1: 'a-b2-c1' },
              b3: { c1: 'a-b3-c1', c2: 'a-b2-c1' }
            }
          }, 'Pass', 'NextState', false));
        });
      });
    });

    context('when the state has `"Type": "Task"`', () => {
      const fakeResources = {
        'arn:aws:lambda:us-east-1:123456789012:function:Add': numbers => numbers.val1 + numbers.val2,
        'arn:aws:lambda:us-east-1:123456789012:function:Double': n => 2 * n,
      };
      context('when there is an InputPath field', () => {
        it('should pass the specified subset to the Resource', () => {
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                InputPath: '$.numbers',
                Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Add',
                ResultPath: '$.sum',
                Type: 'Task',
                Next: 'NextState'
              }
            }
          };
          const fakeStateMachine = new FakeStateMachine(definition, fakeResources);
          expect(
            fakeStateMachine.runState('Target', {
              numbers: { val1: 3, val2: 4 }
            })
          ).to.deep.equal(new RunStateResult({
            numbers: { val1: 3, val2: 4 },
            sum: 7
          }, 'Task', 'NextState', false));
        });
      });
      context('when the InputPath points a path like $.a.b3.c2', () => {
        it('should pass the specified subset to the Resource', () => {
          const definition = {
            StartAt: 'Start',
            States: {
              Target: {
                InputPath: '$.a.b3.c2',
                Resource: 'arn:aws:lambda:us-east-1:123456789012:function:Add',
                ResultPath: '$.sum',
                Type: 'Task',
                Next: 'NextState'
              }
            }
          };
          const fakeStateMachine = new FakeStateMachine(definition, fakeResources);
          expect(
            fakeStateMachine.runState('Target', {
              a: {
                b3: {
                  c2: { val1: 3, val2: 4 }
                }
              }
            })
          ).to.deep.equal(new RunStateResult({
            a: {
              b3: {
                c2: { val1: 3, val2: 4 }
              }
            },
            sum: 7
          }, 'Task', 'NextState', false));
        });
      });
      context('when the Task state is called without InputPath', () => {
        it('should pass $ to the Resource');
      });
      context('when the Task state is called with Input', () => {
        it('should pass the Input to the Resource');
      });
    });
  });
});