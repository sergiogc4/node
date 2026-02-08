const Task = require('../models/Task');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Obtenir totes les tasques
 * @route   GET /api/tasks
 * @access  Private (tasks:read)
 */
exports.getTasks = async (req, res, next) => {
  try {
    const { 
      status, 
      priority, 
      assignedTo, 
      project,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    // Construir query
    let query = {};

    // Filtrar per estat
    if (status) {
      query.status = status;
    }

    // Filtrar per prioritat
    if (priority) {
      query.priority = priority;
    }

    // Filtrar per assignació
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    // Filtrar per projecte
    if (project) {
      query.project = project;
    }

    // Cerca global
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Verificar si l'usuari només pot veure les seves tasques
    if (!(await req.user.hasPermission('tasks:read'))) {
      query.$or = [
        { createdBy: req.user.id },
        { assignedTo: req.user.id }
      ];
    }

    // Paginació
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Executar consulta
    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email')
        .populate('project', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limitInt),
      Task.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: tasks.length,
      total,
      totalPages: Math.ceil(total / limitInt),
      currentPage: pageInt,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtenir tasca per ID
 * @route   GET /api/tasks/:id
 * @access  Private (tasks:read)
 */
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('project', 'name')
      .populate('comments.user', 'name email');

    if (!task) {
      return next(new ErrorResponse(`Tasca no trobada amb ID ${req.params.id}`, 404));
    }

    // Verificar permisos
    if (!(await task.canView(req.user.id))) {
      return next(new ErrorResponse('No tens permís per veure aquesta tasca', 403));
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Crear nova tasca
 * @route   POST /api/tasks
 * @access  Private (tasks:create)
 */
exports.createTask = async (req, res, next) => {
  try {
    // Afegir creador a la tasca
    req.body.createdBy = req.user.id;

    const task = await Task.create(req.body);

    // Populate creador
    await task.populate('createdBy', 'name email');
    
    if (task.assignedTo) {
      await task.populate('assignedTo', 'name email');
    }

    res.status(201).json({
      success: true,
      message: 'Tasca creada correctament',
      data: task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Actualitzar tasca
 * @route   PUT /api/tasks/:id
 * @access  Private (tasks:update)
 */
exports.updateTask = async (req, res, next) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return next(new ErrorResponse(`Tasca no trobada amb ID ${req.params.id}`, 404));
    }

    // Verificar permisos
    if (!(await task.canEdit(req.user.id))) {
      return next(new ErrorResponse('No tens permís per editar aquesta tasca', 403));
    }

    // Actualitzar tasca
    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
    .populate('createdBy', 'name email')
    .populate('assignedTo', 'name email')
    .populate('project', 'name');

    res.status(200).json({
      success: true,
      message: 'Tasca actualitzada correctament',
      data: task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Eliminar tasca
 * @route   DELETE /api/tasks/:id
 * @access  Private (tasks:delete)
 */
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return next(new ErrorResponse(`Tasca no trobada amb ID ${req.params.id}`, 404));
    }

    // Verificar permisos
    if (!(await task.canDelete(req.user.id))) {
      return next(new ErrorResponse('No tens permís per eliminar aquesta tasca', 403));
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Tasca eliminada correctament',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
