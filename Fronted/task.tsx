import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

export default function TaskBoard() {
  const queryClient = useQueryClient();
  const { data: tasks } = useQuery('tasks', () =>
    axios.get('/api/tasks', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
  );

  // Real-time updates
  useEffect(() => {
    socket.on('refreshTasks', () => {
      queryClient.invalidateQueries('tasks');
    });
  }, []);

  // Drag-and-drop handler
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedTasks = Array.from(tasks);
    const [removed] = reorderedTasks.splice(result.source.index, 1);
    reorderedTasks.splice(result.destination.index, 0, removed);
    axios.put(`/api/tasks/${removed._id}`, { status: result.destination.droppableId });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-3 gap-4 p-4">
        {['todo', 'in-progress', 'done'].map((status) => (
          <Droppable droppableId={status} key={status}>
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                <h2 className="text-xl font-bold mb-4">{status.toUpperCase()}</h2>
                {tasks
                  ?.filter((task) => task.status === status)
                  .map((task, index) => (
                    <Draggable key={task._id} draggableId={task._id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="bg-white p-4 mb-2 rounded shadow"
                        >
                          <h3>{task.title}</h3>
                          <p>{task.description}</p>
                        </div>
                      )}
                    </Draggable>
                  ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
