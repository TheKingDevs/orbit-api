/**
 * Resolve with the first successful task, or reject with the first task error
 * after every task has failed. Useful to race redundant upstream sources
 * without waiting for the slowest one when any of them already has an answer.
 */
export function firstSuccessful<T>(tasks: Array<() => Promise<T>>): Promise<T> {
  if (tasks.length === 0) {
    return Promise.reject(new Error('Nenhuma operação disponível.'));
  }

  return new Promise<T>((resolve, reject) => {
    const errors: unknown[] = new Array(tasks.length);
    let remaining = tasks.length;

    tasks.forEach((task, index) => {
      Promise.resolve()
        .then(task)
        .then(resolve, error => {
          errors[index] = error;
          remaining -= 1;

          if (remaining === 0) {
            reject(errors[0] ?? errors.find(value => value !== undefined));
          }
        });
    });
  });
}
